import {
  pgTable,
  text,
  timestamp,
  uuid,
  date,
  vector,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const createdAt = timestamp("created_at").defaultNow().notNull();
const updatedAt = timestamp("updated_at").defaultNow().notNull();

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  title: text("title").notNull().default(""),
  company: text("company").notNull().default(""),
  email: text("email")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  phone: text("phone")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  links: text("links")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  tags: text("tags")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  notes: text("notes").notNull().default(""),
  location: text("location").notNull().default(""),
  birthdate: date("birthdate"),
  createdAt,
  updatedAt,
});

export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;

// Zod schemas for MCP structured output
export const contactSelectSchema = createSelectSchema(contacts);
export const contactInsertSchema = createInsertSchema(contacts);

// Manual schemas compatible with MCP SDK (ZodRawShape)
export const contactOutputShape = {
  id: z.string(),
  name: z.string(),
  title: z.string(),
  company: z.string(),
  email: z.array(z.string()),
  phone: z.array(z.string()),
  links: z.array(z.string()),
  tags: z.array(z.string()),
  notes: z.string(),
  location: z.string(),
  birthdate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

export const contactArrayOutputShape = {
  contacts: z.array(z.object(contactOutputShape)),
};

export const bulkResultOutputShape = {
  success: z.boolean(),
  processedCount: z.number(),
  errors: z.array(z.string()).optional(),
  contacts: z.array(z.object(contactOutputShape)).optional(),
  deletedIds: z.array(z.string()).optional(),
};

export const deleteResultOutputShape = {
  success: z.boolean(),
  message: z.string(),
  deletedId: z.string(),
};
