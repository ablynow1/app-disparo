'use server';

import { prisma } from '@app-disparo/database';
import { revalidatePath } from 'next/cache';

const EVO_KEY = process.env.EVO_KEY || process.env.EVOLUTION_API_KEY || '123456';

// URL interna Docker: o container web acessa a Evolution API pelo nome do service
// Em dev local use http://localhost:8085; em produção Docker use http://evolution_api:8080
const EVO_INTERNAL_URL = process.env.EVOLUTION_INTERNAL_URL || 'http://evolution_api:8080';


// Helper para chamar a Evolution API
async function evoFetch(path: string, options: RequestInit = {}) {
  const url = `${EVO_INTERNAL_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVO_KEY,
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  try { return { ok: res.ok, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, data: text }; }
}

// Busca todas as instâncias da Evolution API
export async function fetchEvoInstances() {
  try {
    const { ok, data } = await evoFetch('/instance/fetchInstances');
    if (!ok) return { instances: [], error: 'Evolution API recusou a requisição' };
    const list = Array.isArray(data) ? data : (data?.value || []);
    return { instances: list.map((i: any) => i.instance || i), error: null };
  } catch {
    return { instances: [], error: 'Evolution API indisponível' };
  }
}

// Cria uma nova instância na Evolution API e salva no banco
export async function createInstance(name: string) {
  try {
    const instanceName = name.trim().replace(/\s+/g, '_').toLowerCase();

    // Cria na Evolution API
    const { ok, data } = await evoFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    if (!ok) {
      return { success: false, error: data?.error || 'Falha ao criar instância na Evolution API' };
    }

    // Salva ou atualiza no banco PostgreSQL
    const existing = await prisma.instance.findFirst({ where: { name: instanceName } });
    if (existing) {
      await prisma.instance.update({ where: { id: existing.id }, data: { status: 'connecting' } });
    } else {
      await prisma.instance.create({ data: { name: instanceName, status: 'connecting' } });
    }

    revalidatePath('/dashboard/instances');
    return { success: true, instanceName, qrCode: data?.qrcode?.base64 || null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Busca o QR Code de uma instância
export async function getQrCode(instanceName: string) {
  try {
    const { ok, data } = await evoFetch(`/instance/connect/${instanceName}`);
    if (!ok) return { qrCode: null, status: 'error' };
    return {
      qrCode: data?.base64 || data?.qrcode?.base64 || null,
      status: data?.state || 'connecting',
    };
  } catch {
    return { qrCode: null, status: 'error' };
  }
}

// Deleta uma instância da Evolution API e do banco
export async function deleteInstance(instanceName: string) {
  try {
    // Remove da Evolution API
    await evoFetch(`/instance/delete/${instanceName}`, { method: 'DELETE' });

    // Remove do banco
    await prisma.instance.deleteMany({ where: { name: instanceName } });

    revalidatePath('/dashboard/instances');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Sincroniza o status de uma instância da Evolution API para o banco
export async function syncInstanceStatus(instanceName: string, status: string, remoteJid?: string) {
  try {
    const existing = await prisma.instance.findFirst({ where: { name: instanceName } });
    if (existing) {
      await prisma.instance.update({ where: { id: existing.id }, data: { status, remoteJid: remoteJid || null } });
    } else {
      await prisma.instance.create({ data: { name: instanceName, status, remoteJid: remoteJid || null } });
    }
    revalidatePath('/dashboard/instances');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
