import { z } from "zod";

// Common field schemas for reuse
export const CONTACT_FIELD_SCHEMAS = {
  name: z.string(),
  title: z.string().optional(),
  company: z.string().optional(),
  email: z.union([z.string(), z.array(z.string())]).optional(),
  phone: z.union([z.string(), z.array(z.string())]).optional(),
  links: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  birthdate: z.string().optional(),
} as const;

// Tool annotations presets
export const TOOL_ANNOTATIONS = {
  READ_ONLY: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  WRITE: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  UPDATE: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  DELETE: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  SEARCH: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;

// Tool definitions
export const TOOL_DEFINITIONS = {
  CREATE_CONTACT: {
    name: "create-contact",
    title: "Create Contact",
    description: "Create a new contact",
  },
  GET_CONTACT: {
    name: "get-contact",
    title: "Get Contact",
    description: "Get a contact by ID",
  },
  UPDATE_CONTACT: {
    name: "update-contact",
    title: "Update Contact",
    description: "Update an existing contact",
  },
  DELETE_CONTACT: {
    name: "delete-contact",
    title: "Delete Contact",
    description: "Delete a contact by ID",
  },
  SEARCH_CONTACTS: {
    name: "search-contacts",
    title: "Search Contacts",
    description: "Search contacts by name, email, or phone",
  },
  SEMANTIC_SEARCH_CONTACTS: {
    name: "semantic-search-contacts",
    title: "Semantic Search Contacts",
    description: "Search contacts using semantic similarity",
  },
  BULK_CREATE_CONTACTS: {
    name: "bulk-create-contacts",
    title: "Bulk Create Contacts",
    description: "Create multiple contacts at once",
  },
  BULK_UPDATE_CONTACTS: {
    name: "bulk-update-contacts",
    title: "Bulk Update Contacts",
    description: "Update multiple contacts at once",
  },
  BULK_DELETE_CONTACTS: {
    name: "bulk-delete-contacts",
    title: "Bulk Delete Contacts",
    description: "Delete multiple contacts at once",
  },
} as const;
