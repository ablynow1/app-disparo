import { StandardOrder } from './order.adapter';
import { OrderStatus } from '@app-disparo/database';

export function normalizeYampiPayload(payload: any): StandardOrder {
  let status: OrderStatus = 'PENDING';
  
  // A Yampi envia um nested object `resource` muitas vezes, dependendo do webhook event, 
  // mas vamos mapear a estrutura root assumindo que o body é a order.
  const orderData = payload.resource || payload;

  const yampiStatus = orderData.status?.alias || orderData.status;

  if (yampiStatus === 'paid') status = 'PAID';
  if (yampiStatus === 'canceled' || yampiStatus === 'refunded') status = 'CANCELED';
  if (yampiStatus === 'pending' || yampiStatus === 'waiting_payment') status = 'PENDING';

  const rawPhone = orderData.customer?.phone?.full_number || orderData.customer?.mobile || '';

  return {
    externalOrderId: String(orderData.id || orderData.token),
    customerName: orderData.customer?.name || 'Cliente Sem Nome',
    customerPhone: String(rawPhone).replace(/\D/g, ''),
    totalAmount: parseFloat(orderData.transactions?.[0]?.amount || orderData.value?.total) || 0,
    status,
    integrationProvider: 'YAMPI',
    originalPayload: payload
  };
}
