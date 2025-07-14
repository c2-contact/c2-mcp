import { createDbInstance } from "./database.js";
import { withContext } from "./context.js";
import { ContactService } from "./contact-service.js";
import type { ContactInput } from "./types.js";

export async function createTestContext<T>(
  fn: (contactService: ContactService) => Promise<T>,
  options: {
    embeddingsEnabled?: boolean;
    aiBaseUrl?: string;
    embeddingsModel?: string;
  } = {},
): Promise<T> {
  // Always use in-memory database for tests, disable vector extension for tests
  const db = await createDbInstance({ enableVector: false });

  const { embeddingsEnabled = false, aiBaseUrl, embeddingsModel } = options;

  return withContext(
    { db, embeddingsEnabled, aiBaseUrl, embeddingsModel },
    async () => {
      const contactService = new ContactService();
      return fn(contactService);
    },
  );
}

// Integration test setup - in-memory DB with localhost:3001 for embeddings
export async function setupIntegrationTest() {
  const db = await createDbInstance({
    dataDir: undefined, // in-memory
    enableVector: true,
  });

  return await withContext(
    {
      db,
      embeddingsEnabled: true,
      aiBaseUrl: "http://localhost:11434/v1", // Test Ollama instance
      embeddingsModel: "mxbai-embed-large",
    },
    async () => {
      return new ContactService();
    },
  );
}

// Unit test setup - in-memory DB, no embeddings
export async function setupUnitTest() {
  const db = await createDbInstance({
    dataDir: undefined, // in-memory
    enableVector: false,
  });

  return await withContext(
    {
      db,
      embeddingsEnabled: false,
      aiBaseUrl: undefined,
      embeddingsModel: undefined,
    },
    async () => {
      return new ContactService();
    },
  );
}

export const sampleContactInput: ContactInput = {
  name: "John Doe",
  title: "Software Engineer",
  company: "Acme Corp",
  email: ["john.doe@example.com", "john@acme.com"],
  phone: ["+1-555-0123", "+1-555-0124"],
  links: ["https://linkedin.com/in/johndoe", "https://github.com/johndoe"],
  tags: ["developer", "javascript", "react"],
  notes: "Great developer with React experience",
  location: "San Francisco, CA",
  birthdate: "1990-01-15",
};

export const sampleContactInput2: ContactInput = {
  name: "Jane Smith",
  title: "Product Manager",
  company: "Tech Corp",
  email: ["jane.smith@techcorp.com"],
  phone: ["+1-555-0200"],
  links: ["https://linkedin.com/in/janesmith"],
  tags: ["product", "management"],
  notes: "Experienced PM with great leadership skills",
  location: "New York, NY",
};
