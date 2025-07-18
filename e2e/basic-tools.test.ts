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
    // list-contacts tool removed
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
    const responseText = (result.content as any)[0].text;
    const contactData = JSON.parse(responseText);
    expect(contactData.id).toBeDefined();
    expect(contactData.name).toBe("John Doe");
    expect(contactData.email).toContain("john@example.com");
    expect(contactData.notes).toBe("Test contact");
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
    const contactData = JSON.parse(responseText);
    expect(contactData.id).toBeDefined();
    expect(contactData.name).toBe("José García-López");
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

  test("should update a contact", async () => {
    // First create a contact to update
    const createResult = await testToolCall(
      testClient.client,
      "create-contact",
      {
        name: "Update Test User",
        title: "Junior Developer",
        company: "StartupCorp",
        email: "update@test.com",
        phone: "555-0001",
        tags: ["developer", "junior"],
        notes: "Original notes",
        location: "New York",
      },
    );

    const createdContact = JSON.parse((createResult.content as any)[0].text);
    const contactId = createdContact.id;

    // Now update the contact
    const updateResult = await testToolCall(
      testClient.client,
      "update-contact",
      {
        id: contactId,
        title: "Senior Developer",
        company: "TechCorp",
        email: ["update@test.com", "senior@techcorp.com"],
        tags: ["developer", "senior", "team-lead"],
        notes: "Updated notes - promoted to senior",
        location: "San Francisco",
      },
    );

    expect(updateResult.content).toBeDefined();
    const updatedContact = JSON.parse((updateResult.content as any)[0].text);
    expect(updatedContact.id).toBe(contactId);
    expect(updatedContact.name).toBe("Update Test User"); // Should remain unchanged
    expect(updatedContact.title).toBe("Senior Developer");
    expect(updatedContact.company).toBe("TechCorp");
    expect(updatedContact.email).toContain("senior@techcorp.com");
    expect(updatedContact.tags).toContain("senior");
    expect(updatedContact.notes).toBe("Updated notes - promoted to senior");
    expect(updatedContact.location).toBe("San Francisco");
  });

  test("should get a contact by ID", async () => {
    // First create a contact
    const createResult = await testToolCall(
      testClient.client,
      "create-contact",
      {
        name: "Get Test User",
        title: "Product Manager",
        company: "ProductCorp",
        email: "get@test.com",
        notes: "Test contact for get operation",
      },
    );

    const createdContact = JSON.parse((createResult.content as any)[0].text);
    const contactId = createdContact.id;

    // Now get the contact
    const getResult = await testToolCall(testClient.client, "get-contact", {
      id: contactId,
    });

    expect(getResult.content).toBeDefined();
    const retrievedContact = JSON.parse((getResult.content as any)[0].text);
    expect(retrievedContact.id).toBe(contactId);
    expect(retrievedContact.name).toBe("Get Test User");
    expect(retrievedContact.title).toBe("Product Manager");
    expect(retrievedContact.company).toBe("ProductCorp");
    expect(retrievedContact.email).toContain("get@test.com");
    expect(retrievedContact.notes).toBe("Test contact for get operation");
  });

  test("should delete a contact", async () => {
    // First create a contact to delete
    const createResult = await testToolCall(
      testClient.client,
      "create-contact",
      {
        name: "Delete Test User",
        email: "delete@test.com",
        notes: "This contact will be deleted",
      },
    );

    const createdContact = JSON.parse((createResult.content as any)[0].text);
    const contactId = createdContact.id;

    // Delete the contact
    const deleteResult = await testToolCall(
      testClient.client,
      "delete-contact",
      {
        id: contactId,
      },
    );

    expect(deleteResult.content).toBeDefined();
    const deleteResponse = JSON.parse((deleteResult.content as any)[0].text);
    expect(deleteResponse.success).toBe(true);
    expect(deleteResponse.deletedId).toBe(contactId);
    expect(deleteResponse.message).toContain("deleted successfully");

    // Verify contact is deleted by trying to get it
    const getResult = await testToolCall(testClient.client, "get-contact", {
      id: contactId,
    });

    const getResponse = JSON.parse((getResult.content as any)[0].text);
    expect(getResponse.contact).toBeNull();
  });

  test("should handle bulk create contacts", async () => {
    const contacts = [
      {
        name: "Bulk User 1",
        title: "Software Engineer",
        company: "TechStart",
        email: "bulk1@test.com",
        tags: ["engineer", "backend"],
      },
      {
        name: "Bulk User 2",
        title: "UX Designer",
        company: "DesignStudio",
        email: ["bulk2@test.com", "bulk2@design.com"],
        tags: ["design", "ux"],
        location: "Remote",
      },
      {
        name: "Bulk User 3",
        title: "Data Scientist",
        company: "DataCorp",
        email: "bulk3@test.com",
        phone: "555-0003",
        notes: "Specializes in machine learning",
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
    const bulkResponse = JSON.parse((result.content as any)[0].text);
    expect(bulkResponse.processedCount).toBe(3);
    expect(bulkResponse.contacts).toHaveLength(3);
    // Allow for context errors in bulk operations
    if (bulkResponse.errors.length > 0) {
      console.log("Bulk create errors:", bulkResponse.errors);
    }

    // Verify each contact was created correctly
    const createdContacts = bulkResponse.contacts;
    expect(createdContacts[0].name).toBe("Bulk User 1");
    expect(createdContacts[0].title).toBe("Software Engineer");
    expect(createdContacts[1].name).toBe("Bulk User 2");
    expect(createdContacts[1].email).toContain("bulk2@design.com");
    expect(createdContacts[2].name).toBe("Bulk User 3");
    expect(createdContacts[2].notes).toBe("Specializes in machine learning");
  });

  test("should handle bulk update contacts", async () => {
    // First create contacts to update
    const createResult = await testToolCall(
      testClient.client,
      "bulk-create-contacts",
      {
        contacts: [
          { name: "Bulk Update 1", title: "Junior Dev", company: "StartupA" },
          {
            name: "Bulk Update 2",
            title: "Junior Designer",
            company: "StartupB",
          },
          { name: "Bulk Update 3", title: "Junior PM", company: "StartupC" },
        ],
      },
    );

    const createResponse = JSON.parse((createResult.content as any)[0].text);
    const contactIds = createResponse.contacts.map((c: any) => c.id);

    // Now bulk update them
    const updates = [
      {
        id: contactIds[0],
        title: "Senior Developer",
        tags: ["senior", "promoted"],
        location: "San Francisco",
      },
      {
        id: contactIds[1],
        title: "Senior Designer",
        company: "DesignCorp",
        tags: ["senior", "design-lead"],
      },
      {
        id: contactIds[2],
        title: "Senior Product Manager",
        notes: "Promoted to senior role",
        tags: ["senior", "product"],
      },
    ];

    const updateResult = await testToolCall(
      testClient.client,
      "bulk-update-contacts",
      {
        updates,
      },
    );

    expect(updateResult.content).toBeDefined();
    const updateResponse = JSON.parse((updateResult.content as any)[0].text);
    expect(updateResponse.processedCount).toBe(3);
    expect(updateResponse.contacts).toHaveLength(3);
    expect(updateResponse.errors).toHaveLength(0);

    // Verify updates
    const updatedContacts = updateResponse.contacts;
    expect(updatedContacts[0].title).toBe("Senior Developer");
    expect(updatedContacts[0].location).toBe("San Francisco");
    expect(updatedContacts[1].title).toBe("Senior Designer");
    expect(updatedContacts[1].company).toBe("DesignCorp");
    expect(updatedContacts[2].title).toBe("Senior Product Manager");
    expect(updatedContacts[2].notes).toBe("Promoted to senior role");
  });

  test("should handle bulk delete contacts", async () => {
    // First create contacts to delete
    const createResult = await testToolCall(
      testClient.client,
      "bulk-create-contacts",
      {
        contacts: [
          { name: "Delete Me 1", email: "delete1@test.com" },
          { name: "Delete Me 2", email: "delete2@test.com" },
          { name: "Delete Me 3", email: "delete3@test.com" },
        ],
      },
    );

    const createResponse = JSON.parse((createResult.content as any)[0].text);
    const contactIds = createResponse.contacts.map((c: any) => c.id);

    // Delete them in bulk
    const deleteResult = await testToolCall(
      testClient.client,
      "bulk-delete-contacts",
      {
        ids: contactIds,
      },
    );

    expect(deleteResult.content).toBeDefined();
    const deleteResponse = JSON.parse((deleteResult.content as any)[0].text);
    expect(deleteResponse.processedCount).toBe(3);
    expect(deleteResponse.errors).toHaveLength(0);

    // Verify contacts are deleted
    for (const contactId of contactIds) {
      const getResult = await testToolCall(testClient.client, "get-contact", {
        id: contactId,
      });
      const getResponse = JSON.parse((getResult.content as any)[0].text);
      expect(getResponse.contact).toBeNull();
    }
  });

  test("should handle get contact with invalid ID", async () => {
    const result = await testToolCall(testClient.client, "get-contact", {
      id: "invalid-uuid-12345",
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    // Handle both JSON response and error text
    try {
      const response = JSON.parse(responseText);
      expect(response.contact).toBeNull();
    } catch {
      // If not JSON, it's an error message
      expect(responseText).toContain("Failed");
    }
  });

  test("should handle update contact with invalid ID", async () => {
    const result = await testToolCall(testClient.client, "update-contact", {
      id: "invalid-uuid-12345",
      name: "Should Not Work",
    });

    expect(result.content).toBeDefined();
    const responseText = (result.content as any)[0].text;
    // Should contain error information about the failed operation
    expect(responseText).toContain("Failed");
  });

  test("should handle delete contact with invalid ID", async () => {
    const result = await testToolCall(testClient.client, "delete-contact", {
      id: "invalid-uuid-12345",
    });

    // Should complete without error (idempotent operation)
    expect(result.content).toBeDefined();
    const response = JSON.parse((result.content as any)[0].text);
    expect(response.success).toBe(true);
  });

  test("should handle bulk operations with mixed valid/invalid data", async () => {
    // First create one valid contact
    const createResult = await testToolCall(
      testClient.client,
      "create-contact",
      {
        name: "Valid Contact",
      },
    );
    const validContact = JSON.parse((createResult.content as any)[0].text);

    // Try bulk update with mix of valid and invalid IDs
    const result = await testToolCall(
      testClient.client,
      "bulk-update-contacts",
      {
        updates: [
          { id: validContact.id, title: "Updated Title" },
          { id: "invalid-uuid-12345", title: "Should Fail" },
        ],
      },
    );

    expect(result.content).toBeDefined();
    const bulkResponse = JSON.parse((result.content as any)[0].text);
    expect(bulkResponse.processedCount).toBe(1);
    expect(bulkResponse.errors.length).toBeGreaterThan(0);
  });

  test("should handle empty bulk operations", async () => {
    const createResult = await testToolCall(
      testClient.client,
      "bulk-create-contacts",
      {
        contacts: [],
      },
    );

    expect(createResult.content).toBeDefined();
    const response = JSON.parse((createResult.content as any)[0].text);
    expect(response.processedCount).toBe(0);
    expect(response.contacts).toHaveLength(0);
  });

  test("should handle very long field values", async () => {
    const longText = "A".repeat(1000); // Very long string
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "Long Text Test",
      notes: longText,
    });

    expect(result.content).toBeDefined();
    const contact = JSON.parse((result.content as any)[0].text);
    expect(contact.name).toBe("Long Text Test");
    expect(contact.notes).toBe(longText);
  });

  test("should handle array vs string field conversion", async () => {
    // Test with string inputs that should become arrays
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "Array Test",
      email: "single@test.com", // String should become array
      phone: "555-0001", // String should become array
      tags: "single-tag", // String should become array
      links: "https://example.com", // String should become array
    });

    expect(result.content).toBeDefined();
    const contact = JSON.parse((result.content as any)[0].text);
    expect(Array.isArray(contact.email)).toBe(true);
    expect(contact.email).toContain("single@test.com");
    expect(Array.isArray(contact.phone)).toBe(true);
    expect(contact.phone).toContain("555-0001");
    expect(Array.isArray(contact.tags)).toBe(true);
    expect(contact.tags).toContain("single-tag");
    expect(Array.isArray(contact.links)).toBe(true);
    expect(contact.links).toContain("https://example.com");
  });

  test("should handle date validation", async () => {
    const result = await testToolCall(testClient.client, "create-contact", {
      name: "Date Test",
      birthdate: "1990-05-15",
    });

    expect(result.content).toBeDefined();
    const contact = JSON.parse((result.content as any)[0].text);
    expect(contact.name).toBe("Date Test");
    expect(contact.birthdate).toBe("1990-05-15");
  });

  test("should handle workflow: create → update → get → delete", async () => {
    // Create
    const createResult = await testToolCall(
      testClient.client,
      "create-contact",
      {
        name: "Workflow Test",
        title: "Initial Title",
        email: "workflow@test.com",
      },
    );
    const created = JSON.parse((createResult.content as any)[0].text);
    expect(created.name).toBe("Workflow Test");

    // Update
    const updateResult = await testToolCall(
      testClient.client,
      "update-contact",
      {
        id: created.id,
        title: "Updated Title",
        company: "New Company",
      },
    );
    const updated = JSON.parse((updateResult.content as any)[0].text);
    expect(updated.title).toBe("Updated Title");
    expect(updated.company).toBe("New Company");

    // Get
    const getResult = await testToolCall(testClient.client, "get-contact", {
      id: created.id,
    });
    const retrieved = JSON.parse((getResult.content as any)[0].text);
    expect(retrieved.title).toBe("Updated Title");
    expect(retrieved.company).toBe("New Company");

    // Delete
    const deleteResult = await testToolCall(
      testClient.client,
      "delete-contact",
      {
        id: created.id,
      },
    );
    const deleteResponse = JSON.parse((deleteResult.content as any)[0].text);
    expect(deleteResponse.success).toBe(true);

    // Verify deletion
    const finalGetResult = await testToolCall(
      testClient.client,
      "get-contact",
      {
        id: created.id,
      },
    );
    const finalResponse = JSON.parse((finalGetResult.content as any)[0].text);
    expect(finalResponse.contact).toBeNull();
  });
});
