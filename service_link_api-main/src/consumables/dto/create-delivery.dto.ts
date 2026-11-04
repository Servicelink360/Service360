export class ConsumableDeliveryItemDto {
  consumableId?: number;
  name?: string;
  unit?: string;
  quantity?: number;
}

export class CreateConsumableDeliveryDto {
  /** Preferred: supply company id from consumable_suppliers. */
  supplierId?: number;
  /** Directory company id (customer_companies) for client-company orders. */
  companyId?: number;
  /** Legacy client user id (optional). */
  customerId?: number;
  customerName?: string;
  companyName?: string;
  /** Optional greeting name (first contact); falls back to company name. */
  contactName?: string;
  siteName?: string;
  subject?: string;
  notes?: string;
  items?: ConsumableDeliveryItemDto[];
  /** When true (default), email after saving. Set false to save a draft. */
  sendEmail?: boolean;
  /** Optional override recipient; otherwise uses the supplier email. */
  emailTo?: string;
  /** Optional CC recipients (comma or semicolon separated). */
  emailCc?: string;
}
