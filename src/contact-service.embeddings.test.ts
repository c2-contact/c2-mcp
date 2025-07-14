import { describe, it, expect } from "bun:test";
import { createTestContext, sampleContactInput } from "./test-helpers.js";
import { getEmbeddingsEnabled } from "./context.js";

describe("ContactService with embeddings disabled", () => {
  it("should create contacts without embeddings when no API key provided", async () => {
    await createTestContext(async (contactService) => {
      // Verify embeddings are disabled
      expect(getEmbeddingsEnabled()).toBe(false);

      // Create contact should work normally
      const contact = await contactService.createContact(sampleContactInput);

      expect(contact.id).toBeDefined();
      expect(contact.name).toBe(sampleContactInput.name);
      expect(contact.title).toBe(sampleContactInput.title!);
      expect(contact.company).toBe(sampleContactInput.company!);
    });
  });

  it("should update contacts without embeddings when no API key provided", async () => {
    await createTestContext(async (contactService) => {
      // Create a contact first
      const contact = await contactService.createContact(sampleContactInput);

      // Update the contact
      const updatedContact = await contactService.updateContact({
        id: contact.id,
        name: "Updated Name",
        title: "Updated Title",
      });

      expect(updatedContact).not.toBeNull();
      expect(updatedContact!.name).toBe("Updated Name");
      expect(updatedContact!.title).toBe("Updated Title");
      expect(updatedContact!.company).toBe(sampleContactInput.company!);
    });
  });

  it("should perform all CRUD operations without errors when embeddings disabled", async () => {
    await createTestContext(async (contactService) => {
      // Create
      const contact = await contactService.createContact({
        name: "Test User",
        company: "Test Corp",
      });
      expect(contact.id).toBeDefined();

      // Read
      const retrieved = await contactService.getContact(contact.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe("Test User");

      // Update
      const updated = await contactService.updateContact({
        id: contact.id,
        name: "Updated User",
      });
      expect(updated!.name).toBe("Updated User");

      // List
      const contacts = await contactService.listContacts();
      expect(contacts.length).toBeGreaterThan(0);

      // Search
      const searchResults = await contactService.searchContacts("Updated");
      expect(searchResults.length).toBeGreaterThan(0);

      // Delete
      const deleted = await contactService.deleteContact(contact.id);
      expect(deleted).toBe(true);

      // Verify deletion
      const notFound = await contactService.getContact(contact.id);
      expect(notFound).toBeNull();
    });
  });
});

describe("ContactService with embeddings enabled", () => {
  it("should enable embeddings context when API key provided", async () => {
    await createTestContext(
      async (contactService) => {
        // Verify embeddings are enabled
        expect(getEmbeddingsEnabled()).toBe(true);

        // Create contact should work normally
        const contact = await contactService.createContact({
          name: "Test User",
          title: "Software Engineer",
          company: "Tech Corp",
          notes: "Great developer",
        });

        expect(contact.id).toBeDefined();
        expect(contact.name).toBe("Test User");

        // Note: We don't test actual embedding creation in unit tests
        // That's covered in e2e tests
      },
      { embeddingsEnabled: true, aiBaseUrl: "http://localhost:11434/v1" },
    );
  });

  it("should handle embeddings disabled gracefully", async () => {
    await createTestContext(
      async (contactService) => {
        // Contact creation should work without embeddings
        const contact = await contactService.createContact({
          name: "Test User",
          company: "Test Corp",
        });

        expect(contact.id).toBeDefined();
        expect(contact.name).toBe("Test User");
      },
      { embeddingsEnabled: false },
    );
  });
});
