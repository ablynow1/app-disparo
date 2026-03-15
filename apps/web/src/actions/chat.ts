'use server';

import { prisma } from '@app-disparo/database';
import { getActiveStoreId } from '@/lib/store';

export async function getContactsWithRecentMessages() {
    const storeId = await getActiveStoreId();

    // Buscar os contatos da loja com a última mensagem enviada/recebida
    const contacts = await prisma.contact.findMany({
        where: { storeId },
        include: {
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1, // apenas a ultima para preview na sidebar
            },
        },
        orderBy: {
            updatedAt: 'desc',
        },
    });

    return contacts;
}

export async function getConversationHistory(contactId: string) {
    const storeId = await getActiveStoreId();

    const contact = await prisma.contact.findFirst({
        where: { id: contactId, storeId },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' }, // cronologico pra UI (cima pra baixo)
            },
        },
    });

    if (!contact) {
        throw new Error('Contact not found or does not belong to your store.');
    }

    return {
        contactId: contact.id,
        pushName: contact.pushName,
        remoteJid: contact.remoteJid,
        aiPaused: contact.aiPaused,
        messages: contact.messages,
    };
}

export async function toggleAiPause(contactId: string, pause: boolean) {
    const storeId = await getActiveStoreId();

    // Validar ownership
    const contact = await prisma.contact.findFirst({
        where: { id: contactId, storeId },
    });

    if (!contact) throw new Error('Action not allowed');

    await prisma.contact.update({
        where: { id: contactId },
        data: { aiPaused: pause },
    });

    return { success: true, aiPaused: pause };
}

export async function sendManualMessage(contactId: string, text: string) {
    const storeId = await getActiveStoreId();
    const contact = await prisma.contact.findFirst({
        where: { id: contactId, storeId },
    });

    if (!contact) throw new Error('Contact not found');

    // Encontrar uma instancia conectada desta loja pra atirar
    const activeInstance = await prisma.instance.findFirst({
        where: { storeId, status: 'open' },
    });

    if (!activeInstance) throw new Error('Não há aparelhos conectados para enviar no momento.');

    // Salvar a nossa mensagem no Banco IMEDIATAMENTE antes de enviar
    const newMessage = await prisma.conversationLog.create({
        data: {
            text,
            direction: 'OUTBOUND',
            contactId,
        },
    });

    // Chamar o disparo na Evolution API real via HTTP
    try {
        const EVO_URL = process.env.EVOLUTION_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL;
        const EVO_KEY = process.env.EVO_KEY || '';

        const response = await fetch(`${EVO_URL}/message/sendText/${activeInstance.name}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVO_KEY,
            },
            body: JSON.stringify({
                number: contact.remoteJid,
                text,
            }),
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Evolution API error: ${response.status} - ${errBody}`);
        }

        return { success: true, message: newMessage };
    } catch (error: any) {
        console.error('Falha ao enviar msg manual:', error);
        return { success: false, error: error.message };
    }
}
