import type { Contact } from "./schema.js";

export interface ContactInput {
  name: string;
  title?: string;
  company?: string;
  email?: string[];
  phone?: string[];
  links?: string[];
  tags?: string[];
  notes?: string;
  location?: string;
  birthdate?: string;
}

export interface ContactUpdate extends Partial<ContactInput> {
  id: string;
}

export interface ContactSearchParams {
  query?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  errors: Array<{
    index: number;
    error: string;
    data?: any;
  }>;
}

export interface BulkInsertResult extends BulkOperationResult {
  contacts: Contact[];
}

export interface BulkUpdateResult extends BulkOperationResult {
  contacts: Contact[];
}

export interface BulkDeleteResult extends BulkOperationResult {
  deletedIds: string[];
}
