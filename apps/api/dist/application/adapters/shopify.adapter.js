"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeShopifyPayload = normalizeShopifyPayload;
function normalizeShopifyPayload(payload) {
    let status = 'PENDING';
    if (payload.financial_status === 'paid')
        status = 'PAID';
    if (payload.financial_status === 'refunded' || payload.financial_status === 'voided')
        status = 'CANCELED';
    if (payload.financial_status === 'pending')
        status = 'PENDING';
    const customerName = payload.customer
        ? `${payload.customer.first_name || ''} ${payload.customer.last_name || ''}`.trim()
        : 'Cliente Oculto';
    // Higieniza o telefone para manter apenas números (Shopify customer.phone ou padrão da ordem)
    const rawPhone = payload.phone || payload.customer?.phone || '';
    const customerPhone = rawPhone.replace(/\D/g, '');
    return {
        externalOrderId: String(payload.order_number || payload.id),
        customerName: customerName || 'Desconhecido',
        customerPhone: customerPhone,
        totalAmount: parseFloat(payload.total_price) || 0,
        status,
        integrationProvider: 'SHOPIFY',
        originalPayload: payload
    };
}
