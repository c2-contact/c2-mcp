import { describe, it, expect } from "bun:test";
import { createTestContext, sampleContactInput } from "./test-helpers.js";

describe("ContactService.deleteContact", () => {
  it("should delete an existing contact", async () => {
    await createTestContext(async (contactService) => {
      // Create a contact first
      const createdContact =
        await contactService.createContact(sampleContactInput);

      // Delete the contact
      const deleteResult = await contactService.deleteContact(
        createdContact.id,
      );

      expect(deleteResult).toBe(true);

      // Verify the contact is gone
      const retrievedContact = await contactService.getContact(
        createdContact.id,
      );
      expect(retrievedContact).toBeNull();
    });
  });

  it("should return false for non-existent contact id", async () => {
    await createTestContext(async (contactService) => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const deleteResult = await contactService.deleteContact(nonExistentId);

      // Should return false for non-existent contacts
      expect(deleteResult).toBe(false);
    });
  });

  it("should not affect other contacts when deleting one", async () => {
    await createTestContext(async (contactService) => {
      // Create two contacts
      const contact1 = await contactService.createContact(sampleContactInput);
      const contact2 = await contactService.createContact({
        name: "Second Contact",
        company: "Different Company",
      });

      // Delete the first contact
      const deleteResult = await contactService.deleteContact(contact1.id);
      expect(deleteResult).toBe(true);

      // Verify first contact is gone
      const retrievedContact1 = await contactService.getContact(contact1.id);
      expect(retrievedContact1).toBeNull();

      // Verify second contact still exists
      const retrievedContact2 = await contactService.getContact(contact2.id);
      expect(retrievedContact2).not.toBeNull();
      expect(retrievedContact2!.name).toBe("Second Contact");
    });
  });

  it("should handle multiple deletions of the same contact", async () => {
    await createTestContext(async (contactService) => {
      const createdContact =
        await contactService.createContact(sampleContactInput);

      // Delete the contact twice
      const firstDelete = await contactService.deleteContact(createdContact.id);
      const secondDelete = await contactService.deleteContact(
        createdContact.id,
      );

      expect(firstDelete).toBe(true);
      expect(secondDelete).toBe(false); // Second delete should return false

      // Verify the contact is gone
      const retrievedContact = await contactService.getContact(
        createdContact.id,
      );
      expect(retrievedContact).toBeNull();
    });
  });

  it("should return false for invalid UUID format", async () => {
    await createTestContext(async (contactService) => {
      const invalidId = "invalid-uuid-format";

      // Should return false for invalid UUID
      const result = await contactService.deleteContact(invalidId);
      expect(result).toBe(false);
    });
  });
});
