import { describe, it, expect } from "bun:test";
import { createTestContext, sampleContactInput } from "./test-helpers.js";

describe("ContactService.getContact", () => {
  it("should retrieve an existing contact by id", async () => {
    await createTestContext(async (contactService) => {
      // Create a contact first
      const createdContact =
        await contactService.createContact(sampleContactInput);

      // Retrieve it by id
      const retrievedContact = await contactService.getContact(
        createdContact.id,
      );

      expect(retrievedContact).not.toBeNull();
      expect(retrievedContact!.id).toBe(createdContact.id);
      expect(retrievedContact!.name).toBe(createdContact.name);
      expect(retrievedContact!.email).toEqual(createdContact.email);
      expect(retrievedContact!.phone).toEqual(createdContact.phone);
      expect(retrievedContact!.createdAt).toEqual(createdContact.createdAt);
      expect(retrievedContact!.updatedAt).toEqual(createdContact.updatedAt);
    });
  });

  it("should return null for non-existent contact id", async () => {
    await createTestContext(async (contactService) => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const contact = await contactService.getContact(nonExistentId);

      expect(contact).toBeNull();
    });
  });

  it("should handle invalid UUID format gracefully", async () => {
    await createTestContext(async (contactService) => {
      const invalidId = "invalid-uuid-format";

      // Should throw an error for invalid UUID format
      expect(contactService.getContact(invalidId)).rejects.toThrow();
    });
  });

  it("should retrieve contact with all field types correctly", async () => {
    await createTestContext(async (contactService) => {
      const complexContact = {
        name: "Complex Contact",
        title: "Senior Developer",
        company: "Tech Corp",
        email: ["test1@example.com", "test2@example.com"],
        phone: ["+1-555-0001", "+1-555-0002"],
        links: ["https://github.com/user", "https://linkedin.com/in/user"],
        tags: ["javascript", "typescript", "react"],
        notes: "This is a test contact with complex data",
        location: "Remote",
        birthdate: "1985-06-15",
      };

      const created = await contactService.createContact(complexContact);
      const retrieved = await contactService.getContact(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.email).toEqual(complexContact.email);
      expect(retrieved!.phone).toEqual(complexContact.phone);
      expect(retrieved!.links).toEqual(complexContact.links);
      expect(retrieved!.tags).toEqual(complexContact.tags);
      expect(retrieved!.birthdate).toBe(complexContact.birthdate);
    });
  });

  it("should retrieve contact with minimal data correctly", async () => {
    await createTestContext(async (contactService) => {
      const minimalContact = {
        name: "Minimal Contact",
      };

      const created = await contactService.createContact(minimalContact);
      const retrieved = await contactService.getContact(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe("Minimal Contact");
      expect(retrieved!.title).toBe("");
      expect(retrieved!.company).toBe("");
      expect(retrieved!.email).toEqual([]);
      expect(retrieved!.phone).toEqual([]);
      expect(retrieved!.links).toEqual([]);
      expect(retrieved!.tags).toEqual([]);
      expect(retrieved!.notes).toBe("");
      expect(retrieved!.location).toBe("");
      expect(retrieved!.birthdate).toBeNull();
    });
  });
});
