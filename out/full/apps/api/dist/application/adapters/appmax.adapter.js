"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAppmaxPayload = normalizeAppmaxPayload;
function normalizeAppmaxPayload(payload) {
    let status = 'PENDING';
    // Appmax geralmente envia via webhook o evento (ex: OrderCreated, OrderPaid).
    // A estrutura do body contém 'data' com detalhes da venda.
    const event = payload.event;
    const data = payload.data || payload;
    if (event === 'OrderPaid' || data.status === 'aprovado')
        status = 'PAID';
    if (event === 'OrderCanceled' || data.status === 'recusado' || data.status === 'cancelado')
        status = 'CANCELED';
    if (event === 'OrderCreated' || event === 'OrderBilletPrinted' || data.status === 'pendente')
        status = 'PENDING';
    const customerName = data.customer_name || data.customer?.name || 'Cliente Sem Nome';
    const customerPhone = data.customer_phone || data.customer?.phone || data.customer?.telephone || '';
    return {
        externalOrderId: String(data.id),
        customerName: customerName,
        customerPhone: String(customerPhone).replace(/\D/g, ''),
        totalAmount: parseFloat(data.total || data.amount) || 0,
        status,
        integrationProvider: 'APPMAX',
        originalPayload: payload
    };
}
