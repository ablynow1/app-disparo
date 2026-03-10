'use server';

import { prisma } from '@app-disparo/database';
import { revalidatePath } from 'next/cache';

const EVO_KEY = process.env.EVO_KEY || process.env.EVOLUTION_API_KEY || '123456';
const EVO_INTERNAL_URL = process.env.EVOLUTION_INTERNAL_URL || 'http://evolution_api:8080';

// Helper para chamar a Evolution API
async function evoFetch(path: string, options: RequestInit = {}) {
  const url = `${EVO_INTERNAL_URL}${path}`;
  console.log(`[evoFetch] ${options.method || 'GET'} ${url}`);
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
  console.log(`[evoFetch] status=${res.status} body=${text.slice(0, 300)}`);
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

// Extrai base64 do QR de qualquer formato de resposta da Evolution API
function extractBase64(data: any): string | null {
  if (!data) return null;
  // v2.x connect endpoint
  if (data.base64) return data.base64;
  // v2.x create com qrcode:true
  if (data.qrcode?.base64) return data.qrcode.base64;
  // Outros formatos
  if (data.qr?.base64) return data.qr.base64;
  if (typeof data.base64 === 'string') return data.base64;
  return null;
}

// Busca todas as instâncias da Evolution API
export async function fetchEvoInstances() {
  try {
    const { ok, data } = await evoFetch('/instance/fetchInstances');
    if (!ok) return { instances: [], error: 'Evolution API recusou a requisição' };
    const list = Array.isArray(data) ? data : (data?.value || []);
    return { instances: list.map((i: any) => i.instance || i), error: null };
  } catch (e: any) {
    return { instances: [], error: `Evolution API indisponível: ${e.message}` };
  }
}

// Cria uma nova instância na Evolution API e salva no banco
export async function createInstance(name: string) {
  try {
    const instanceName = name.trim().replace(/\s+/g, '_').toLowerCase();

    // Passo 1: Cria na Evolution API
    const createRes = await evoFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    if (!createRes.ok) {
      const errMsg = typeof createRes.data === 'object'
        ? (createRes.data?.message || createRes.data?.error || JSON.stringify(createRes.data))
        : String(createRes.data);
      return { success: false, error: `Evolution API [${createRes.status}]: ${errMsg}` };
    }

    // Passo 2: Chama connect para forçar geração do QR Code
    await new Promise(r => setTimeout(r, 1500)); // Aguarda 1.5s para a instância inicializar
    const connectRes = await evoFetch(`/instance/connect/${instanceName}`);
    const qrCode = extractBase64(connectRes.data) || extractBase64(createRes.data);

    // Passo 3: Salva no banco PostgreSQL
    const existing = await prisma.instance.findFirst({ where: { name: instanceName } });
    if (existing) {
      await prisma.instance.update({ where: { id: existing.id }, data: { status: 'connecting' } });
    } else {
      await prisma.instance.create({ data: { name: instanceName, status: 'connecting' } });
    }

    revalidatePath('/dashboard/instances');
    return { success: true, instanceName, qrCode };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Busca o QR Code de uma instância (chamado pelo polling do cliente)
export async function getQrCode(instanceName: string) {
  try {
    const { ok, data } = await evoFetch(`/instance/connect/${instanceName}`);
    if (!ok) return { qrCode: null, status: 'error', raw: data };

    // Verifica se já conectou
    const state = data?.instance?.state || data?.state || '';
    if (state === 'open') return { qrCode: null, status: 'open', raw: data };

    return {
      qrCode: extractBase64(data),
      status: state || 'connecting',
      raw: data,
    };
  } catch (e: any) {
    return { qrCode: null, status: 'error', raw: e.message };
  }
}

// Deleta uma instância da Evolution API e do banco
export async function deleteInstance(instanceName: string) {
  try {
    await evoFetch(`/instance/delete/${instanceName}`, { method: 'DELETE' });
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
