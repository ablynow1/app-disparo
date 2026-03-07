import { Provider, OrderStatus } from '@app-disparo/database';

export interface StandardOrder {
  externalOrderId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: OrderStatus; // PENDING | PAID | CANCELED
  integrationProvider: Provider; // SHOPIFY | YAMPI | APPMAX | HOTMART | KIWIFY
  originalPayload: any;
}
