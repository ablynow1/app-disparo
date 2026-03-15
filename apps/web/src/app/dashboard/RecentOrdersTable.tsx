'use client';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

type OrderStatus = 'PENDING' | 'PAID' | 'CANCELED' | 'REFUNDED' | 'FAILED_TO_SEND';

interface RecentOrder {
    id: string;
    customerName: string | null;
    customerPhone: string | null;
    amount: number | null;
    status: OrderStatus;
    createdAt: Date;
    store: {
        name: string;
    };
}

const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
        case 'PAID':
            return (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium w-max">
                    <CheckCircle2 className="w-3 h-3" /> Pago
                </span>
            );
        case 'FAILED_TO_SEND':
            return (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium w-max">
                    <XCircle className="w-3 h-3" /> Falha no Envio
                </span>
            );
        case 'PENDING':
            return (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium w-max">
                    <Clock className="w-3 h-3" /> Pendente
                </span>
            );
        case 'CANCELED':
        case 'REFUNDED':
            return (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-xs font-medium w-max">
                    <XCircle className="w-3 h-3" /> Cancelado
                </span>
            );
        default:
            return (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium w-max">
                    Desconhecido
                </span>
            );
    }
};

export function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
    if (!orders || orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-zinc-900/20 border border-zinc-800/40 rounded-3xl">
                <p className="text-zinc-400 text-sm">Nenhum lead retido no funil recentemente.</p>
                <p className="text-zinc-600 text-xs mt-1">Sincronize uma loja nas Integrações.</p>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/30 backdrop-blur border border-zinc-800/50 rounded-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-800/50">
                <h3 className="text-lg font-medium text-zinc-100">Disparos Recentes</h3>
                <p className="text-xs text-zinc-500 mt-1">Acompanhe as automações despachadas em tempo real.</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/20 border-b border-zinc-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-medium">Cliente</th>
                            <th scope="col" className="px-6 py-4 font-medium">Contato</th>
                            <th scope="col" className="px-6 py-4 font-medium">Valor</th>
                            <th scope="col" className="px-6 py-4 font-medium">Status / Delivery</th>
                            <th scope="col" className="px-6 py-4 font-medium text-right">Age</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/30">
                        {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-zinc-800/10 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-zinc-200">{order.customerName || 'Cliente Oculto'}</span>
                                        <span className="text-xs text-zinc-500">{order.store.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-zinc-400">
                                    {order.customerPhone || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-zinc-300">
                                    {order.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.amount) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(order.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-zinc-500">
                                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ptBR })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
