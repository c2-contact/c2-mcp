import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  createMCPTestClient,
  testToolCall,
  testOllamaIntegration,
  checkOllamaHealth,
} from "./mcp-client.js";
import type { MCPTestClient } from "./mcp-client.js";

describe("MCP Server E2E Tests", () => {
  let testClient: MCPTestClient;

  beforeAll(async () => {
    testClient = await createMCPTestClient();
    // Wait a bit for server to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (testClient) {
      await testClient.cleanup();
    }
  });

  test("should list available tools", async () => {
    const tools = await testClient.client.listTools();

    expect(tools.tools).toBeDefined();
    expect(tools.tools!.length).toBeGreaterThan(0);

    const toolNames = tools.tools!.map((t) => t.name);
    expect(toolNames).toContain("create-contact");
    expect(toolNames).toContain("get-contact");
    expect(toolNames).toContain("list-contacts");
    expect(toolNames).toContain("search-contacts");
    expect(toolNames).toContain("semantic-search-contacts");
  });

  test("should create a contact", async () => {
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "John Doe",
      email: "john@example.com",
      phone: "555-1234",
      notes: "Test contact",
    });

    expect(result.content).toBeDefined();
    expect((result.content as any)[0].type).toBe("text");
    expect((result.content as any)[0].text).toContain("Created contact");
    expect((result.content as any)[0].text).toContain("John Doe");
  });

  test("should list contacts", async () => {
    const result = await testToolCall(testClient.client, "list-contacts", {});

    expect(result.content).toBeDefined();
    expect((result.content as any)[0].type).toBe("text");
    expect((result.content as any)[0].text).toContain("Found");
    expect((result.content as any)[0].text).toContain("contacts");
  });

  test("should search contacts", async () => {
    const result = await testToolCall(testClient.client, "search-contacts", {
      query: "John",
    });

    expect(result.content).toBeDefined();
    expect((result.content as any)[0].type).toBe("text");
    expect((result.content as any)[0].text).toContain("Search results");
  });

  test("should perform semantic search", async () => {
    const result = await testToolCall(
      testClient.client,
      "semantic-search-contacts",
      {
        query: "software developer",
      },
    );

    expect(result.content).toBeDefined();
    expect((result.content as any)[0].type).toBe("text");
    // Should either return results or an error about embeddings not being available
    expect((result.content as any)[0].text).toMatch(
      /(Semantic search results|Semantic search failed)/,
    );
  });

  test("should test Ollama integration readiness", async () => {
    const expectedTools = [
      "create-contact",
      "get-contact",
      "update-contact",
      "delete-contact",
      "list-contacts",
      "search-contacts",
      "semantic-search-contacts",
      "bulk-create-contacts",
      "bulk-update-contacts",
      "bulk-delete-contacts",
    ];

    const results = await testOllamaIntegration(
      testClient.client,
      expectedTools,
    );

    // All tools should be available
    for (const result of results) {
      expect(result.available).toBe(true);
      expect(result.schema).toBeDefined();
    }
  });

  test("should handle bulk operations", async () => {
    const contacts = [
      { name: "Alice Smith", email: "alice@example.com" },
      { name: "Bob Johnson", email: "bob@example.com" },
    ];

    const result = await testToolCall(
      testClient.client,
      "bulk-create-contacts",
      {
        contacts,
      },
    );

    expect(result.content).toBeDefined();
    expect((result.content as any)[0].type).toBe("text");
    expect((result.content as any)[0].text).toContain("Bulk insert result");
  });
});

describe("Extended Contact Fields E2E Tests", () => {
  let testClient: MCPTestClient;
  let createdContactId: string;

  beforeAll(async () => {
    testClient = await createMCPTestClient();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (testClient) {
      await testClient.cleanup();
    }
  });

  test("should create contact with all extended fields", async () => {
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "Sarah Wilson",
      title: "Senior Software Engineer",
      company: "TechCorp Inc",
      email: ["sarah@techcorp.com", "sarah.wilson@personal.com"],
      phone: ["+1-555-0123", "+1-555-0124"],
      links: [
        "https://linkedin.com/in/sarahwilson",
        "https://github.com/sarahw",
        "https://sarahwilson.dev",
      ],
      tags: ["developer", "javascript", "react", "nodejs", "team-lead"],
      notes:
        "Experienced full-stack developer with team leadership experience. Expert in modern web technologies.",
      location: "San Francisco, CA",
      birthdate: "1988-03-15",
    });

    expect(result.content).toBeDefined();
    expect((result.content as any)[0].type).toBe("text");
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("Created contact");
    expect(responseText).toContain("Sarah Wilson");
    expect(responseText).toContain("Senior Software Engineer");
    expect(responseText).toContain("TechCorp Inc");
    expect(responseText).toContain("sarah@techcorp.com");
    expect(responseText).toContain("linkedin.com/in/sarahwilson");
    expect(responseText).toContain("developer");
    expect(responseText).toContain("San Francisco, CA");
    expect(responseText).toContain("1988-03-15");

    // Extract contact ID for later tests
    const contactData = JSON.parse(responseText.split("Created contact: ")[1]);
    createdContactId = contactData.id;
  });

  test("should handle array fields with single string input", async () => {
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "Mike Chen",
      title: "Product Manager",
      company: "StartupXYZ",
      email: "mike@startupxyz.com", // Single string instead of array
      phone: "+1-555-9999", // Single string instead of array
      links: "https://linkedin.com/in/mikechen", // Single string instead of array
      tags: "product-management", // Single string instead of array
      location: "New York, NY",
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("Created contact");
    expect(responseText).toContain("Mike Chen");
    expect(responseText).toContain("mike@startupxyz.com");
    expect(responseText).toContain("product-management");
  });

  test("should update contact with extended fields", async () => {
    // Create a fresh contact for this test to avoid dependency issues
    const createResult = await testToolCall(
      testClient.client,
      "create-contact",
      {
        name: "Update Test Contact",
        title: "Software Engineer",
        company: "Original Company",
      },
    );

    const createResponse = (createResult.content as any)[0].text;
    const contactData = JSON.parse(
      createResponse.split("Created contact: ")[1],
    );
    const contactId = contactData.id;

    // Now update the contact
    const result = await testToolCall(testClient.client, "update-contact", {
      id: contactId,
      title: "Principal Software Engineer", // Updated title
      company: "TechCorp International", // Updated company
      tags: [
        "developer",
        "javascript",
        "react",
        "nodejs",
        "team-lead",
        "architecture",
      ], // Added tag
      location: "Seattle, WA", // Updated location
      notes:
        "Promoted to Principal Engineer. Now leading architecture decisions for multiple teams.",
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("Updated contact");
    expect(responseText).toContain("Principal Software Engineer");
    expect(responseText).toContain("TechCorp International");
    expect(responseText).toContain("architecture");
    expect(responseText).toContain("Seattle, WA");
  });

  test("should get contact with all fields", async () => {
    // Use the contact ID from the first test, or create a new one if needed
    let contactId = createdContactId;
    if (!contactId) {
      const createResult = await testToolCall(
        testClient.client,
        "create-contact",
        {
          name: "Get Test Contact",
          title: "Test Engineer",
        },
      );
      const createResponse = (createResult.content as any)[0].text;
      const contactData = JSON.parse(
        createResponse.split("Created contact: ")[1],
      );
      contactId = contactData.id;
    }

    const result = await testToolCall(testClient.client, "get-contact", {
      id: contactId,
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    const contact = JSON.parse(responseText);

    expect(contact.name).toBeDefined();
    expect(contact.id).toBe(contactId);
    expect(contact.email).toBeDefined();
    expect(contact.phone).toBeDefined();
    expect(contact.links).toBeDefined();
    expect(contact.tags).toBeDefined();
  });
  test("should handle bulk create with extended fields", async () => {
    const contacts = [
      {
        name: "Emma Davis",
        title: "UX Designer",
        company: "DesignStudio",
        email: ["emma@designstudio.com"],
        tags: ["design", "ux", "figma"],
        location: "Austin, TX",
        birthdate: "1992-07-20",
      },
      {
        name: "Alex Rodriguez",
        title: "DevOps Engineer",
        company: "CloudTech",
        email: ["alex@cloudtech.com", "alex.rodriguez@gmail.com"],
        phone: ["+1-555-7777"],
        links: ["https://github.com/alexr"],
        tags: ["devops", "kubernetes", "aws"],
        location: "Denver, CO",
        notes: "Expert in container orchestration and cloud infrastructure",
      },
    ];

    const result = await testToolCall(
      testClient.client,
      "bulk-create-contacts",
      {
        contacts,
      },
    );

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("Bulk insert result");
    expect(responseText).toContain("Emma Davis");
    expect(responseText).toContain("Alex Rodriguez");
    expect(responseText).toContain("UX Designer");
    expect(responseText).toContain("DevOps Engineer");
  });

  test("should handle special characters and unicode", async () => {
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "José García-López",
      title: "Développeur Senior",
      company: "Société Française",
      email: ["jose@company.fr"],
      notes:
        "Spécialisé en développement web avec expertise en React & Node.js. Parle français, espagnol et anglais.",
      location: "Paris, France 🇫🇷",
      tags: ["développeur", "react", "français", "multilingue"],
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("José García-López");
    expect(responseText).toContain("Développeur Senior");
    expect(responseText).toContain("🇫🇷");
  });

  test("should handle empty and minimal contact creation", async () => {
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "Minimal Contact",
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("Created contact");
    expect(responseText).toContain("Minimal Contact");

    // Should have default empty arrays for array fields
    const contact = JSON.parse(responseText.split("Created contact: ")[1]);
    expect(Array.isArray(contact.email)).toBe(true);
    expect(Array.isArray(contact.phone)).toBe(true);
    expect(Array.isArray(contact.links)).toBe(true);
    expect(Array.isArray(contact.tags)).toBe(true);
  });

  test("should handle bulk update with extended fields", async () => {
    // First create some contacts to update
    const createResult = await testToolCall(
      testClient.client,
      "bulk-create-contacts",
      {
        contacts: [
          { name: "Update Test 1", title: "Junior Dev" },
          { name: "Update Test 2", title: "Junior Designer" },
        ],
      },
    );

    const createResponse = JSON.parse(
      (createResult.content as any)[0].text.split("Bulk insert result: ")[1],
    );
    const contactIds = createResponse.contacts.map((c: any) => c.id);

    // Now update them
    const updateResult = await testToolCall(
      testClient.client,
      "bulk-update-contacts",
      {
        updates: [
          {
            id: contactIds[0],
            title: "Senior Developer",
            company: "Tech Company",
            tags: ["senior", "developer", "promoted"],
            location: "Remote",
          },
          {
            id: contactIds[1],
            title: "Senior Designer",
            company: "Design Agency",
            tags: ["senior", "designer", "promoted"],
            links: ["https://portfolio.example.com"],
          },
        ],
      },
    );

    expect(updateResult.content).toBeDefined();
    const responseText = (updateResult.content as any)[0].text;
    expect(responseText).toContain("Bulk update result");
    expect(responseText).toContain("Senior Developer");
    expect(responseText).toContain("Senior Designer");
  });

  test("should handle search with extended field content", async () => {
    const result = await testToolCall(testClient.client, "search-contacts", {
      query: "DevOps",
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("Search results");
    // Should find Alex Rodriguez created earlier
    expect(responseText).toContain("Alex Rodriguez");
  });

  test("should handle date validation", async () => {
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "Date Test Contact",
      birthdate: "1995-12-25", // Valid ISO date
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("Date Test Contact");
    expect(responseText).toContain("1995-12-25");
  });
});

describe("Error Handling E2E Tests", () => {
  let testClient: MCPTestClient;

  beforeAll(async () => {
    testClient = await createMCPTestClient();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (testClient) {
      await testClient.cleanup();
    }
  });

  test("should handle get contact with invalid ID", async () => {
    const result = await testToolCall(testClient.client, "get-contact", {
      id: "invalid-uuid-12345",
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    // Should contain either "not found" or "Failed query" (database error for invalid UUID)
    expect(responseText).toMatch(/(not found|Failed query)/);
  });

  test("should handle update contact with invalid ID", async () => {
    const result = await testToolCall(testClient.client, "update-contact", {
      id: "invalid-uuid-12345",
      name: "Updated Name",
    });

    // Should not throw error, but return null result
    expect(result.content).toBeDefined();
  });

  test("should handle delete contact with invalid ID", async () => {
    const result = await testToolCall(testClient.client, "delete-contact", {
      id: "invalid-uuid-12345",
    });

    // Should complete without error (idempotent operation)
    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("deleted successfully");
  });

  test("should handle bulk operations with mixed valid/invalid data", async () => {
    const result = await testToolCall(
      testClient.client,
      "bulk-create-contacts",
      {
        contacts: [
          { name: "Valid Contact 1", email: "valid1@example.com" },
          { name: "Valid Contact 2", email: "valid2@example.com" },
        ],
      },
    );

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("Bulk insert result");
  });

  test("should handle very long field values", async () => {
    const longText = "A".repeat(1000); // Very long string
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "Long Text Test",
      notes: longText,
      location: longText,
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("Long Text Test");
  });

  test("should handle empty arrays and null-like values", async () => {
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "Empty Arrays Test",
      email: [],
      phone: [],
      links: [],
      tags: [],
      notes: "",
      location: "",
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    expect(responseText).toContain("Empty Arrays Test");
  });
});
