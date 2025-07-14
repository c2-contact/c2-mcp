import { describe, it, expect } from "bun:test";
import { createTestContext, sampleContactInput } from "./test-helpers.js";

describe("ContactService.updateContact", () => {
  it("should update a contact with new data", async () => {
    await createTestContext(async (contactService) => {
      // Create a contact first
      const createdContact =
        await contactService.createContact(sampleContactInput);

      // Update the contact
      const updateData = {
        id: createdContact.id,
        name: "Updated Name",
        title: "Updated Title",
        company: "Updated Company",
        notes: "Updated notes",
      };

      const updatedContact = await contactService.updateContact(updateData);

      expect(updatedContact).not.toBeNull();
      expect(updatedContact!.id).toBe(createdContact.id);
      expect(updatedContact!.name).toBe("Updated Name");
      expect(updatedContact!.title).toBe("Updated Title");
      expect(updatedContact!.company).toBe("Updated Company");
      expect(updatedContact!.notes).toBe("Updated notes");

      // Unchanged fields should remain the same
      expect(updatedContact!.email).toEqual(createdContact.email);
      expect(updatedContact!.phone).toEqual(createdContact.phone);
      expect(updatedContact!.createdAt).toEqual(createdContact.createdAt);

      // updatedAt should be different
      expect(updatedContact!.updatedAt.getTime()).toBeGreaterThan(
        createdContact.updatedAt.getTime(),
      );
    });
  });

  it("should update array fields correctly", async () => {
    await createTestContext(async (contactService) => {
      const createdContact =
        await contactService.createContact(sampleContactInput);

      const updateData = {
        id: createdContact.id,
        email: ["new@example.com", "another@example.com"],
        phone: ["+1-999-9999"],
        tags: ["updated", "tags"],
        links: ["https://newlink.com"],
      };

      const updatedContact = await contactService.updateContact(updateData);

      expect(updatedContact).not.toBeNull();
      expect(updatedContact!.email).toEqual([
        "new@example.com",
        "another@example.com",
      ]);
      expect(updatedContact!.phone).toEqual(["+1-999-9999"]);
      expect(updatedContact!.tags).toEqual(["updated", "tags"]);
      expect(updatedContact!.links).toEqual(["https://newlink.com"]);

      // Other fields should remain unchanged
      expect(updatedContact!.name).toBe(createdContact.name);
      expect(updatedContact!.company).toBe(createdContact.company);
    });
  });

  it("should update only specified fields", async () => {
    await createTestContext(async (contactService) => {
      const createdContact =
        await contactService.createContact(sampleContactInput);

      // Update only the name
      const updateData = {
        id: createdContact.id,
        name: "Only Name Updated",
      };

      const updatedContact = await contactService.updateContact(updateData);

      expect(updatedContact).not.toBeNull();
      expect(updatedContact!.name).toBe("Only Name Updated");

      // All other fields should remain unchanged
      expect(updatedContact!.title).toBe(createdContact.title);
      expect(updatedContact!.company).toBe(createdContact.company);
      expect(updatedContact!.email).toEqual(createdContact.email);
      expect(updatedContact!.phone).toEqual(createdContact.phone);
      expect(updatedContact!.notes).toBe(createdContact.notes);
      expect(updatedContact!.location).toBe(createdContact.location);
    });
  });

  it("should return null for non-existent contact id", async () => {
    await createTestContext(async (contactService) => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const updateData = {
        id: nonExistentId,
        name: "This Won't Work",
      };

      const result = await contactService.updateContact(updateData);

      expect(result).toBeNull();
    });
  });

  it("should clear fields when set to empty values", async () => {
    await createTestContext(async (contactService) => {
      const createdContact =
        await contactService.createContact(sampleContactInput);

      const updateData = {
        id: createdContact.id,
        title: "",
        company: "",
        notes: "",
        location: "",
        email: [],
        phone: [],
        tags: [],
        links: [],
      };

      const updatedContact = await contactService.updateContact(updateData);

      expect(updatedContact).not.toBeNull();
      expect(updatedContact!.title).toBe("");
      expect(updatedContact!.company).toBe("");
      expect(updatedContact!.notes).toBe("");
      expect(updatedContact!.location).toBe("");
      expect(updatedContact!.email).toEqual([]);
      expect(updatedContact!.phone).toEqual([]);
      expect(updatedContact!.tags).toEqual([]);
      expect(updatedContact!.links).toEqual([]);

      // Name should remain unchanged
      expect(updatedContact!.name).toBe(createdContact.name);
    });
  });

  it("should update birthdate field", async () => {
    await createTestContext(async (contactService) => {
      const createdContact = await contactService.createContact({
        name: "Test User",
      });

      const updateData = {
        id: createdContact.id,
        birthdate: "1995-12-25",
      };

      const updatedContact = await contactService.updateContact(updateData);

      expect(updatedContact).not.toBeNull();
      expect(updatedContact!.birthdate).toBe("1995-12-25");
    });
  });

  it("should handle special characters in updated fields", async () => {
    await createTestContext(async (contactService) => {
      const createdContact = await contactService.createContact({
        name: "Test User",
      });

      const updateData = {
        id: createdContact.id,
        name: "José María O'Connor",
        company: "Café & Co.",
        notes: "Special chars: àáâãäåæçèéêë & symbols: @#$%^&*()",
      };

      const updatedContact = await contactService.updateContact(updateData);

      expect(updatedContact).not.toBeNull();
      expect(updatedContact!.name).toBe("José María O'Connor");
      expect(updatedContact!.company).toBe("Café & Co.");
      expect(updatedContact!.notes).toBe(
        "Special chars: àáâãäåæçèéêë & symbols: @#$%^&*()",
      );
    });
  });
});
