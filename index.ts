import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer as McpServerType } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "path";
import { createDbInstance } from "./src/database.js";
import { withContext } from "./src/context.js";
import { ContactService } from "./src/contact-service.js";
import { logger, getStorageDir } from "./src/logger.js";
import type { ContactUpdate } from "./src/types.js";
import type { Contact } from "./src/schema.js";
import {
  contactSelectSchema,
  contactOutputShape,
  contactArrayOutputShape,
  bulkResultOutputShape,
  deleteResultOutputShape,
} from "./src/schema.js";

// Helper function to transform contact data for MCP output
function transformContactForOutput(contact: Contact) {
  return {
    ...contact,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    birthdate: contact.birthdate ? contact.birthdate.toString() : null,
  };
}

// Helper function to transform bulk operation results
function transformBulkResult(result: any) {
  const transformed = { ...result };

  // Transform contacts if present
  if (result.contacts) {
    transformed.contacts = result.contacts.map(transformContactForOutput);
  }

  // Transform errors to strings if present
  if (result.errors) {
    transformed.errors = result.errors.map((error: any) =>
      typeof error === "string" ? error : JSON.stringify(error),
    );
  }

  return transformed;
}

function getDatabasePath(): string {
  const dbPathArg = process.argv.find((arg) => arg.startsWith("--db-path="));
  if (dbPathArg) {
    const path = dbPathArg.split("=")[1];
    if (path) return path;
  }
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  return path.join(getStorageDir(), "db");
}

function getAIBaseUrl(): string {
  const baseUrlArg = process.argv.find((arg) =>
    arg.startsWith("--ai-base-url="),
  );
  if (baseUrlArg) {
    const url = baseUrlArg.split("=")[1];
    if (url) return url;
  }
  if (process.env.AI_BASE_URL) {
    return process.env.AI_BASE_URL;
  }
  return "http://localhost:11434/v1";
}

function getEmbeddingsModel(): string | undefined {
  const modelArg = process.argv.find((arg) =>
    arg.startsWith("--embeddings-model="),
  );
  if (modelArg) {
    return modelArg.split("=")[1];
  }
  if (process.env.EMBEDDINGS_MODEL) {
    return process.env.EMBEDDINGS_MODEL;
  }
  return undefined;
}

export async function initializeContactService() {
  const dbPath = getDatabasePath();
  const aiBaseUrl = getAIBaseUrl();
  const embeddingsModel = getEmbeddingsModel();
  const embeddingsEnabled = true;
  const finalModel = embeddingsModel || "mxbai-embed-large";

  logger.info("Starting Contact Management System...");
  logger.info(`Database: ${dbPath}`);
  logger.info(`Embeddings: ${embeddingsEnabled ? "enabled" : "disabled"}`);
  logger.info(`AI Base URL: ${aiBaseUrl}`);
  logger.info(`Embeddings Model: ${finalModel}`);

  const db = await createDbInstance({
    dataDir: dbPath,
    enableVector: embeddingsEnabled,
  });

  return new ContactService({
    db,
    embeddingsEnabled,
    aiBaseUrl,
    embeddingsModel: finalModel,
  });
}

export { ContactService } from "./src/contact-service.js";
export { createDbInstance } from "./src/database.js";
export { withContext } from "./src/context.js";

const server = new McpServer({
  name: "c2-contact-service",
  version: "1.0.0",
});

let contactService: ContactService;

async function setupServer() {
  try {
    contactService = await initializeContactService();
    logger.info("Contact service initialized successfully");

    // Register tools after service is initialized
    registerTools(server, contactService);

    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("MCP server started successfully");
  } catch (error) {
    logger.error(`Failed to initialize server: ${error}`);
    process.exit(1);
  }
}

function registerTools(server: McpServerType, contactService: ContactService) {
  // Create Contact Tool
  server.registerTool(
    "create-contact",
    {
      title: "Create Contact",
      description: "Create a new contact",
      inputSchema: {
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
      },
      annotations: {
        title: "Create Contact",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      outputSchema: contactOutputShape,
    },
    async ({
      name,
      title,
      company,
      email,
      phone,
      links,
      tags,
      notes,
      location,
      birthdate,
    }) => {
      const contact = await contactService.createContact({
        name,
        title,
        company,
        email: email ? (Array.isArray(email) ? email : [email]) : undefined,
        phone: phone ? (Array.isArray(phone) ? phone : [phone]) : undefined,
        links: links ? (Array.isArray(links) ? links : [links]) : undefined,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        notes,
        location,
        birthdate,
      });
      const transformedContact = transformContactForOutput(contact);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(transformedContact),
          },
        ],
        structuredContent: transformedContact,
      };
    },
  );

  // Get Contact Tool
  server.registerTool(
    "get-contact",
    {
      title: "Get Contact",
      description: "Get a contact by ID",
      inputSchema: {
        id: z.string(),
      },
      annotations: {
        title: "Get Contact",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      // Remove output schema to avoid validation issues with null values
    },
    async ({ id }) => {
      const contact = await contactService.getContact(id);
      if (!contact) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ contact: null }),
            },
          ],
          structuredContent: { contact: null },
        };
      }

      const transformedContact = transformContactForOutput(contact);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(transformedContact),
          },
        ],
        structuredContent: transformedContact,
      };
    },
  );

  // Search Contacts Tool
  server.registerTool(
    "search-contacts",
    {
      title: "Search Contacts",
      description: "Search contacts by name, email, or phone",
      inputSchema: {
        query: z.string(),
      },
      annotations: {
        title: "Search Contacts",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      outputSchema: contactArrayOutputShape,
    },
    async ({ query }) => {
      const contacts = await contactService.searchContacts(query);
      const transformedContacts = contacts.map(transformContactForOutput);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ contacts: transformedContacts }),
          },
        ],
        structuredContent: { contacts: transformedContacts },
      };
    },
  );

  // Update Contact Tool
  server.registerTool(
    "update-contact",
    {
      title: "Update Contact",
      description: "Update an existing contact",
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        title: z.string().optional(),
        company: z.string().optional(),
        email: z.union([z.string(), z.array(z.string())]).optional(),
        phone: z.union([z.string(), z.array(z.string())]).optional(),
        links: z.union([z.string(), z.array(z.string())]).optional(),
        tags: z.union([z.string(), z.array(z.string())]).optional(),
        notes: z.string().optional(),
        location: z.string().optional(),
        birthdate: z.string().optional(),
      },
      annotations: {
        title: "Update Contact",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      outputSchema: contactOutputShape,
    },
    async ({
      id,
      name,
      title,
      company,
      email,
      phone,
      links,
      tags,
      notes,
      location,
      birthdate,
    }) => {
      const updateData: any = { id };
      if (name !== undefined) updateData.name = name;
      if (title !== undefined) updateData.title = title;
      if (company !== undefined) updateData.company = company;
      if (email !== undefined)
        updateData.email = Array.isArray(email) ? email : [email];
      if (phone !== undefined)
        updateData.phone = Array.isArray(phone) ? phone : [phone];
      if (links !== undefined)
        updateData.links = Array.isArray(links) ? links : [links];
      if (tags !== undefined)
        updateData.tags = Array.isArray(tags) ? tags : [tags];
      if (notes !== undefined) updateData.notes = notes;
      if (location !== undefined) updateData.location = location;
      if (birthdate !== undefined) updateData.birthdate = birthdate;

      const contact = await contactService.updateContact(updateData);
      if (!contact) {
        return {
          content: [
            {
              type: "text",
              text: `Contact with ID ${id} not found`,
            },
          ],
          isError: true,
        };
      }
      const transformedContact = transformContactForOutput(contact);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(transformedContact),
          },
        ],
        structuredContent: transformedContact,
      };
    },
  );

  // Delete Contact Tool
  server.registerTool(
    "delete-contact",
    {
      title: "Delete Contact",
      description: "Delete a contact by ID",
      inputSchema: {
        id: z.string(),
      },
      annotations: {
        title: "Delete Contact",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      outputSchema: deleteResultOutputShape,
    },
    async ({ id }) => {
      await contactService.deleteContact(id);
      const result = {
        success: true,
        message: `Contact with ID ${id} deleted successfully`,
        deletedId: id,
      };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
        structuredContent: result,
      };
    },
  );

  // Semantic Search Tool
  server.registerTool(
    "semantic-search-contacts",
    {
      title: "Semantic Search Contacts",
      description: "Search contacts using semantic similarity",
      inputSchema: {
        query: z.string(),
        limit: z.number().optional(),
      },
      annotations: {
        title: "Semantic Search Contacts",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      outputSchema: contactArrayOutputShape,
    },
    async ({ query }) => {
      const contacts = await contactService.searchContacts(query);
      const transformedContacts = contacts.map(transformContactForOutput);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ contacts: transformedContacts }),
          },
        ],
        structuredContent: { contacts: transformedContacts },
      };
    },
  );

  // Bulk Create Contacts Tool
  server.registerTool(
    "bulk-create-contacts",
    {
      title: "Bulk Create Contacts",
      description: "Create multiple contacts at once",
      inputSchema: {
        contacts: z.array(
          z.object({
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
          }),
        ),
      },
      annotations: {
        title: "Bulk Create Contacts",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      outputSchema: bulkResultOutputShape,
    },
    async ({ contacts }) => {
      const normalizedContacts = contacts.map((contact) => ({
        ...contact,
        email: contact.email
          ? Array.isArray(contact.email)
            ? contact.email
            : [contact.email]
          : undefined,
        phone: contact.phone
          ? Array.isArray(contact.phone)
            ? contact.phone
            : [contact.phone]
          : undefined,
        links: contact.links
          ? Array.isArray(contact.links)
            ? contact.links
            : [contact.links]
          : undefined,
        tags: contact.tags
          ? Array.isArray(contact.tags)
            ? contact.tags
            : [contact.tags]
          : undefined,
      }));

      const result =
        await contactService.bulkInsertContacts(normalizedContacts);
      const transformedResult = transformBulkResult(result);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(transformedResult),
          },
        ],
        structuredContent: transformedResult,
      };
    },
  );

  // Bulk Update Contacts Tool
  server.registerTool(
    "bulk-update-contacts",
    {
      title: "Bulk Update Contacts",
      description: "Update multiple contacts at once",
      inputSchema: {
        updates: z.array(
          z.object({
            id: z.string(),
            name: z.string().optional(),
            title: z.string().optional(),
            company: z.string().optional(),
            email: z.union([z.string(), z.array(z.string())]).optional(),
            phone: z.union([z.string(), z.array(z.string())]).optional(),
            links: z.union([z.string(), z.array(z.string())]).optional(),
            tags: z.union([z.string(), z.array(z.string())]).optional(),
            notes: z.string().optional(),
            location: z.string().optional(),
            birthdate: z.string().optional(),
          }),
        ),
      },
      annotations: {
        title: "Bulk Update Contacts",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      outputSchema: bulkResultOutputShape,
    },
    async ({ updates }) => {
      const normalizedUpdates = updates.map((update) => ({
        ...update,
        email: update.email
          ? Array.isArray(update.email)
            ? update.email
            : [update.email]
          : undefined,
        phone: update.phone
          ? Array.isArray(update.phone)
            ? update.phone
            : [update.phone]
          : undefined,
        links: update.links
          ? Array.isArray(update.links)
            ? update.links
            : [update.links]
          : undefined,
        tags: update.tags
          ? Array.isArray(update.tags)
            ? update.tags
            : [update.tags]
          : undefined,
      }));

      const result = await contactService.bulkUpdateContacts(normalizedUpdates);
      const transformedResult = transformBulkResult(result);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(transformedResult),
          },
        ],
        structuredContent: transformedResult,
      };
    },
  );

  // Bulk Delete Contacts Tool
  server.registerTool(
    "bulk-delete-contacts",
    {
      title: "Bulk Delete Contacts",
      description: "Delete multiple contacts at once",
      inputSchema: {
        ids: z.array(z.string()),
      },
      annotations: {
        title: "Bulk Delete Contacts",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      outputSchema: bulkResultOutputShape,
    },
    async ({ ids }) => {
      const result = await contactService.bulkDeleteContacts(ids);
      const transformedResult = transformBulkResult(result);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(transformedResult),
          },
        ],
        structuredContent: transformedResult,
      };
    },
  );
}
setupServer();
