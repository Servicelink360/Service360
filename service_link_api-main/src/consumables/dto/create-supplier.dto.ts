export class CreateConsumableSupplierDto {
  companyId?: number | null;
  name?: string;
  category?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  notes?: string | null;
  isActive?: boolean;
}
