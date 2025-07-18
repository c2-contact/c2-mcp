import { eq, or, ilike, desc, sql, gt, cosineDistance } from "drizzle-orm";
import {
  contacts,
  embeddings,
  type Contact,
  type NewContact,
  type NewEmbedding,
} from "./schema.js";
import type {
  ContactInput,
  ContactUpdate,
  ContactSearchParams,
  BulkInsertResult,
  BulkUpdateResult,
  BulkDeleteResult,
} from "./types.js";
import { getDb, getEmbeddingsEnabled } from "./context.js";
import { createEmbedding, createContactEmbeddingText } from "./embeddings.js";
import { logger } from "./logger.js";

export class ContactService {
  private _db?: any;
  private _embeddingsEnabled?: boolean;
  private _aiBaseUrl?: string;
  private _embeddingsModel?: string;

  constructor(options?: {
    db?: any;
    embeddingsEnabled?: boolean;
    aiBaseUrl?: string;
    embeddingsModel?: string;
  }) {
    if (options) {
      this._db = options.db;
      this._embeddingsEnabled = options.embeddingsEnabled;
      this._aiBaseUrl = options.aiBaseUrl;
      this._embeddingsModel = options.embeddingsModel;
    }
  }

  private get db() {
    return this._db || getDb();
  }

  private get embeddingsEnabled() {
    return this._embeddingsEnabled !== undefined
      ? this._embeddingsEnabled
      : getEmbeddingsEnabled();
  }

  async createContact(input: ContactInput): Promise<Contact> {
    const newContact: NewContact = {
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [contact] = await this.db
      .insert(contacts)
      .values(newContact)
      .returning();
    if (!contact) {
      throw new Error("Failed to create contact");
    }

    // Create embedding if enabled
    if (this.embeddingsEnabled) {
      await this.createContactEmbedding(contact);
    }

    return contact;
  }

  private async createContactEmbedding(contact: Contact): Promise<void> {
    try {
      const embeddingText = createContactEmbeddingText(contact);
      const embedding = await createEmbedding(embeddingText, {
        baseUrl: this._aiBaseUrl,
        model: this._embeddingsModel,
      });

      // Validate embedding has proper dimensions
      if (!embedding || embedding.length === 0) {
        logger.warn(`Skipping empty embedding for contact: ${contact.id}`);
        return;
      }

      const newEmbedding: NewEmbedding = {
        contactId: contact.id,
        content: embeddingText,
        embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.db.insert(embeddings).values(newEmbedding);
    } catch (error) {
      logger.error(
        `Failed to create embedding for contact: ${contact.id} - ${error}`,
      );
    }
  }

  async getContact(id: string): Promise<Contact | null> {
    const result = await this.db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    return result[0] || null;
  }

  async updateContact(update: ContactUpdate): Promise<Contact | null> {
    const { id, ...updateData } = update;

    const result = await this.db
      .update(contacts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();

    const contact = result[0] || null;

    // Update embedding if enabled and contact exists
    if (contact && this.embeddingsEnabled) {
      await this.updateContactEmbedding(contact);
    }

    return contact;
  }

  private async updateContactEmbedding(contact: Contact): Promise<void> {
    try {
      const embeddingText = createContactEmbeddingText(contact);
      const embedding = await createEmbedding(embeddingText, {
        baseUrl: this._aiBaseUrl,
        model: this._embeddingsModel,
      });

      // Delete existing embedding and create new one
      await this.db
        .delete(embeddings)
        .where(eq(embeddings.contactId, contact.id));

      const newEmbedding: NewEmbedding = {
        contactId: contact.id,
        content: embeddingText,
        embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.db.insert(embeddings).values(newEmbedding);
    } catch (error) {
      logger.error(
        `Failed to update embedding for contact: ${contact.id} - ${error}`,
      );
    }
  }

  async deleteContact(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(contacts)
        .where(eq(contacts.id, id))
        .returning({ id: contacts.id });
      return result.length > 0;
    } catch {
      return false;
    }
  }

  async listContacts(params: ContactSearchParams = {}): Promise<Contact[]> {
    const { query, limit = 50, offset = 0 } = params;

    if (query) {
      return await this.db
        .select()
        .from(contacts)
        .where(
          or(
            ilike(contacts.name, `%${query}%`),
            ilike(contacts.company, `%${query}%`),
            ilike(contacts.notes, `%${query}%`),
            ilike(contacts.title, `%${query}%`),
            ilike(contacts.location, `%${query}%`),
            sql`EXISTS (SELECT 1 FROM unnest(${contacts.email}) AS email WHERE email ILIKE ${"%" + query + "%"})`,
            sql`EXISTS (SELECT 1 FROM unnest(${contacts.phone}) AS phone WHERE phone ILIKE ${"%" + query + "%"})`,
            sql`EXISTS (SELECT 1 FROM unnest(${contacts.links}) AS link WHERE link ILIKE ${"%" + query + "%"})`,
            sql`EXISTS (SELECT 1 FROM unnest(${contacts.tags}) AS tag WHERE tag ILIKE ${"%" + query + "%"})`,
          ),
        )
        .orderBy(desc(contacts.updatedAt))
        .limit(limit)
        .offset(offset);
    }

    return await this.db
      .select()
      .from(contacts)
      .orderBy(desc(contacts.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  async searchContacts(query: string): Promise<Contact[]> {
    if (!this.embeddingsEnabled) {
      // Fall back to regular text search
      return this.listContacts({ query });
    }

    try {
      // Perform both semantic and regular search
      const [semanticResults, regularResults] = await Promise.all([
        this.semanticSearch(query),
        this.listContacts({ query }),
      ]);

      // Combine and deduplicate results, prioritizing semantic search
      const combinedResults = new Map<string, Contact>();

      // Add semantic results first (higher priority)
      semanticResults.forEach((contact) => {
        combinedResults.set(contact.id, contact);
      });

      // Add regular search results
      regularResults.forEach((contact) => {
        if (!combinedResults.has(contact.id)) {
          combinedResults.set(contact.id, contact);
        }
      });

      return Array.from(combinedResults.values());
    } catch (error) {
      logger.error(
        `Semantic search failed, falling back to regular search: ${error}`,
      );
      return this.listContacts({ query });
    }
  }

  private async semanticSearch(query: string): Promise<Contact[]> {
    try {
      // Create embedding for the search query (reverted: no instruct)
      // const prompt = createSemanticSearchPrompt(query);
      const queryEmbedding = await createEmbedding(query, {
        baseUrl: this._aiBaseUrl,
        model: this._embeddingsModel,
      }); // Validate query embedding
      if (!queryEmbedding || queryEmbedding.length === 0) {
        logger.warn(
          "Failed to create query embedding, falling back to text search",
        );
        return [];
      }

      // Use Drizzle's built-in cosine distance function for vector similarity search
      const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

      const similarContacts = await this.db
        .select({
          contact: contacts,
          similarity,
        })
        .from(embeddings)
        .innerJoin(contacts, eq(embeddings.contactId, contacts.id))
        .where(gt(similarity, 0.5)) // Similarity threshold
        .orderBy(desc(similarity))
        .limit(10);

      return similarContacts.map((result: any) => result.contact);
    } catch (error) {
      logger.error(`Semantic search error: ${error}`);
      return [];
    }
  }

  async bulkInsertContacts(inputs: ContactInput[]): Promise<BulkInsertResult> {
    const result: BulkInsertResult = {
      success: true,
      processedCount: 0,
      errors: [],
      contacts: [],
    };

    if (inputs.length === 0) {
      return result;
    }

    try {
      // Prepare all contacts for insertion
      const newContacts: NewContact[] = inputs.map((input) => ({
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Insert all contacts in a single query
      const insertedContacts = await this.db
        .insert(contacts)
        .values(newContacts)
        .returning();

      result.contacts = insertedContacts;
      result.processedCount = insertedContacts.length;

      // Create embeddings for all contacts if enabled
      if (getEmbeddingsEnabled() && insertedContacts.length > 0) {
        await this.bulkCreateEmbeddings(insertedContacts);
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        index: -1,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during bulk insert",
      });
      return result;
    }
  }

  async bulkUpdateContacts(
    updates: ContactUpdate[],
  ): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      success: true,
      processedCount: 0,
      errors: [],
      contacts: [],
    };

    if (updates.length === 0) {
      return result;
    }

    // Process updates one by one to handle individual errors
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      if (!update) continue;

      try {
        const updatedContact = await this.updateContact(update);
        if (updatedContact) {
          result.contacts.push(updatedContact);
          result.processedCount++;
        } else {
          result.errors.push({
            index: i,
            error: "Contact not found",
            data: update,
          });
        }
      } catch (error) {
        result.success = false;
        result.errors.push({
          index: i,
          error: error instanceof Error ? error.message : "Unknown error",
          data: update,
        });
      }
    }

    return result;
  }

  async bulkDeleteContacts(ids: string[]): Promise<BulkDeleteResult> {
    const result: BulkDeleteResult = {
      success: true,
      processedCount: 0,
      errors: [],
      deletedIds: [],
    };

    if (ids.length === 0) {
      return result;
    }

    // Process deletions one by one to track individual results
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (!id) continue;

      try {
        const deleted = await this.deleteContact(id);
        if (deleted) {
          result.deletedIds.push(id);
          result.processedCount++;
        } else {
          result.errors.push({
            index: i,
            error: "Contact not found or deletion failed",
            data: id,
          });
        }
      } catch (error) {
        result.success = false;
        result.errors.push({
          index: i,
          error: error instanceof Error ? error.message : "Unknown error",
          data: id,
        });
      }
    }

    return result;
  }

  private async bulkCreateEmbeddings(contacts: Contact[]): Promise<void> {
    const embeddingPromises = contacts.map(async (contact) => {
      try {
        await this.createContactEmbedding(contact);
      } catch (error) {
        logger.error(
          `Failed to create embedding for contact during bulk insert: ${contact.id} - ${error}`,
        );
      }
    });

    // Process embeddings in parallel but don't fail the entire operation if some fail
    await Promise.allSettled(embeddingPromises);
  }
}
