import { describe, it, expect, beforeEach } from "bun:test";
import { ContactService } from "./contact-service.js";
import { createDbInstance } from "./database.js";
import { withContext } from "./context.js";
import type { ContactInput, ContactUpdate } from "./types.js";

describe("ContactService Bulk Operations", () => {
  let contactService: ContactService;
  let db: any;

  beforeEach(async () => {
    db = await createDbInstance();
    await withContext({ db, embeddingsEnabled: false }, async () => {
      contactService = new ContactService();
    });
  });

  describe("bulkInsertContacts", () => {
    it("should insert multiple contacts successfully", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        const inputs: ContactInput[] = [
          {
            name: "John Doe",
            title: "Software Engineer",
            company: "Tech Corp",
            email: ["john@techcorp.com"],
            phone: ["+1-555-0001"],
            tags: ["developer", "javascript"],
            notes: "Senior developer with 5 years experience",
          },
          {
            name: "Jane Smith",
            title: "Product Manager",
            company: "Startup Inc",
            email: ["jane@startup.com"],
            phone: ["+1-555-0002"],
            tags: ["product", "strategy"],
            notes: "Experienced PM with strong technical background",
          },
          {
            name: "Bob Wilson",
            title: "Designer",
            company: "Design Studio",
            email: ["bob@design.com"],
            phone: ["+1-555-0003"],
            tags: ["design", "ui", "ux"],
            notes: "Creative designer specializing in user interfaces",
          },
        ];

        const result = await contactService.bulkInsertContacts(inputs);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(3);
        expect(result.errors).toHaveLength(0);
        expect(result.contacts).toHaveLength(3);

        // Verify each contact was created correctly
        result.contacts.forEach((contact, index) => {
          const input = inputs[index];
          expect(contact.name).toBe(input!.name);
          expect(contact.title).toBe(input!.title || "");
          expect(contact.company).toBe(input!.company || "");
          expect(contact.id).toBeDefined();
          expect(contact.createdAt).toBeDefined();
          expect(contact.updatedAt).toBeDefined();
        });
      });
    });

    it("should handle empty input array", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        const result = await contactService.bulkInsertContacts([]);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(0);
        expect(result.errors).toHaveLength(0);
        expect(result.contacts).toHaveLength(0);
      });
    });

    it("should handle bulk insert with minimal data", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        const inputs: ContactInput[] = [
          { name: "Minimal Contact 1" },
          { name: "Minimal Contact 2" },
          { name: "Minimal Contact 3" },
        ];

        const result = await contactService.bulkInsertContacts(inputs);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(3);
        expect(result.errors).toHaveLength(0);
        expect(result.contacts).toHaveLength(3);

        result.contacts.forEach((contact, index) => {
          const input = inputs[index];
          expect(contact.name).toBe(input!.name);
          expect(contact.title).toBe("");
          expect(contact.company).toBe("");
        });
      });
    });

    it("should work with embeddings enabled", async () => {
      await withContext({ db, embeddingsEnabled: true }, async () => {
        const inputs: ContactInput[] = [
          {
            name: "AI Researcher",
            title: "Research Scientist",
            company: "AI Lab",
            notes: "Expert in machine learning and neural networks",
          },
          {
            name: "Data Scientist",
            title: "Senior Data Scientist",
            company: "Data Corp",
            notes:
              "Specializes in statistical analysis and predictive modeling",
          },
        ];

        const result = await contactService.bulkInsertContacts(inputs);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(2);
        expect(result.errors).toHaveLength(0);
        expect(result.contacts).toHaveLength(2);
      });
    });

    it("should handle large batch insert", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        const inputs: ContactInput[] = Array.from({ length: 50 }, (_, i) => ({
          name: `Contact ${i + 1}`,
          title: `Title ${i + 1}`,
          company: `Company ${i + 1}`,
          email: [`contact${i + 1}@example.com`],
          notes: `Notes for contact ${i + 1}`,
        }));

        const result = await contactService.bulkInsertContacts(inputs);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(50);
        expect(result.errors).toHaveLength(0);
        expect(result.contacts).toHaveLength(50);
      });
    });
  });

  describe("bulkUpdateContacts", () => {
    it("should update multiple contacts successfully", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        // First create some contacts
        const inputs: ContactInput[] = [
          { name: "Original Name 1", title: "Original Title 1" },
          { name: "Original Name 2", title: "Original Title 2" },
          { name: "Original Name 3", title: "Original Title 3" },
        ];

        const insertResult = await contactService.bulkInsertContacts(inputs);
        expect(insertResult.success).toBe(true);

        // Now update them
        const updates: ContactUpdate[] = insertResult.contacts.map(
          (contact, index) => ({
            id: contact.id,
            name: `Updated Name ${index + 1}`,
            title: `Updated Title ${index + 1}`,
            company: `New Company ${index + 1}`,
          }),
        );

        const updateResult = await contactService.bulkUpdateContacts(updates);

        expect(updateResult.success).toBe(true);
        expect(updateResult.processedCount).toBe(3);
        expect(updateResult.errors).toHaveLength(0);
        expect(updateResult.contacts).toHaveLength(3);

        // Verify updates were applied
        updateResult.contacts.forEach((contact, index) => {
          expect(contact.name).toBe(`Updated Name ${index + 1}`);
          expect(contact.title).toBe(`Updated Title ${index + 1}`);
          expect(contact.company).toBe(`New Company ${index + 1}`);
        });
      });
    });

    it("should handle empty update array", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        const result = await contactService.bulkUpdateContacts([]);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(0);
        expect(result.errors).toHaveLength(0);
        expect(result.contacts).toHaveLength(0);
      });
    });

    it("should handle non-existent contact IDs", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        const updates: ContactUpdate[] = [
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            name: "Updated Name 1",
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440002",
            name: "Updated Name 2",
          },
        ];

        const result = await contactService.bulkUpdateContacts(updates);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(0);
        expect(result.errors).toHaveLength(2);
        expect(result.contacts).toHaveLength(0);

        result.errors.forEach((error, index) => {
          expect(error.index).toBe(index);
          expect(error.error).toBe("Contact not found");
          expect(error.data).toEqual(updates[index]);
        });
      });
    });

    it("should handle mixed valid and invalid updates", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        // Create one valid contact
        const insertResult = await contactService.bulkInsertContacts([
          { name: "Valid Contact" },
        ]);
        const validId = insertResult.contacts[0]!.id;

        const updates: ContactUpdate[] = [
          {
            id: validId,
            name: "Updated Valid Contact",
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            name: "Updated Invalid Contact",
          },
        ];

        const result = await contactService.bulkUpdateContacts(updates);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.contacts).toHaveLength(1);

        expect(result.contacts[0]!.name).toBe("Updated Valid Contact");
        expect(result.errors[0]!.index).toBe(1);
        expect(result.errors[0]!.error).toBe("Contact not found");
      });
    });

    it("should handle partial updates", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        // Create a contact with full data
        const insertResult = await contactService.bulkInsertContacts([
          {
            name: "Full Contact",
            title: "Original Title",
            company: "Original Company",
            email: ["original@example.com"],
            notes: "Original notes",
          },
        ]);

        const contactId = insertResult.contacts[0]!.id;

        // Update only the name
        const updates: ContactUpdate[] = [
          {
            id: contactId,
            name: "Updated Name Only",
          },
        ];

        const result = await contactService.bulkUpdateContacts(updates);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(1);
        expect(result.contacts[0]!.name).toBe("Updated Name Only");
        expect(result.contacts[0]!.title).toBe("Original Title");
        expect(result.contacts[0]!.company).toBe("Original Company");
      });
    });
  });

  describe("bulkDeleteContacts", () => {
    it("should delete multiple contacts successfully", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        // First create some contacts
        const inputs: ContactInput[] = [
          { name: "Contact to Delete 1" },
          { name: "Contact to Delete 2" },
          { name: "Contact to Delete 3" },
        ];

        const insertResult = await contactService.bulkInsertContacts(inputs);
        expect(insertResult.success).toBe(true);

        const idsToDelete = insertResult.contacts.map((contact) => contact.id);

        const deleteResult =
          await contactService.bulkDeleteContacts(idsToDelete);

        expect(deleteResult.success).toBe(true);
        expect(deleteResult.processedCount).toBe(3);
        expect(deleteResult.errors).toHaveLength(0);
        expect(deleteResult.deletedIds).toHaveLength(3);
        expect(deleteResult.deletedIds).toEqual(idsToDelete);

        // Verify contacts were actually deleted
        for (const id of idsToDelete) {
          const contact = await contactService.getContact(id);
          expect(contact).toBeNull();
        }
      });
    });

    it("should handle empty ID array", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        const result = await contactService.bulkDeleteContacts([]);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(0);
        expect(result.errors).toHaveLength(0);
        expect(result.deletedIds).toHaveLength(0);
      });
    });

    it("should handle non-existent contact IDs", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        const nonExistentIds = ["non-existent-1", "non-existent-2"];

        const result = await contactService.bulkDeleteContacts(nonExistentIds);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(0);
        expect(result.errors).toHaveLength(2);
        expect(result.deletedIds).toHaveLength(0);

        result.errors.forEach((error, index) => {
          expect(error.index).toBe(index);
          expect(error.error).toBe("Contact not found or deletion failed");
          expect(error.data).toBe(nonExistentIds[index]);
        });
      });
    });

    it("should handle mixed valid and invalid IDs", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        // Create one valid contact
        const insertResult = await contactService.bulkInsertContacts([
          { name: "Valid Contact to Delete" },
        ]);
        const validId = insertResult.contacts[0]!.id;

        const idsToDelete = [validId, "550e8400-e29b-41d4-a716-446655440000"];

        const result = await contactService.bulkDeleteContacts(idsToDelete);

        expect(result.success).toBe(true);
        expect(result.processedCount).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.deletedIds).toHaveLength(1);
        expect(result.deletedIds[0]).toBe(validId);

        expect(result.errors[0]!.index).toBe(1);
        expect(result.errors[0]!.error).toBe(
          "Contact not found or deletion failed",
        );
        expect(result.errors[0]!.data).toBe(
          "550e8400-e29b-41d4-a716-446655440000",
        );

        // Verify valid contact was deleted
        const contact = await contactService.getContact(validId);
        expect(contact).toBeNull();
      });
    });

    it("should handle large batch delete", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        // Create many contacts
        const inputs: ContactInput[] = Array.from({ length: 25 }, (_, i) => ({
          name: `Contact to Delete ${i + 1}`,
        }));

        const insertResult = await contactService.bulkInsertContacts(inputs);
        const idsToDelete = insertResult.contacts.map((contact) => contact.id);

        const deleteResult =
          await contactService.bulkDeleteContacts(idsToDelete);

        expect(deleteResult.success).toBe(true);
        expect(deleteResult.processedCount).toBe(25);
        expect(deleteResult.errors).toHaveLength(0);
        expect(deleteResult.deletedIds).toHaveLength(25);
      });
    });
  });

  describe("Bulk Operations Integration", () => {
    it("should handle complete workflow: insert, update, delete", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        // Step 1: Bulk insert
        const inputs: ContactInput[] = [
          { name: "Workflow Contact 1", title: "Engineer" },
          { name: "Workflow Contact 2", title: "Designer" },
          { name: "Workflow Contact 3", title: "Manager" },
        ];

        const insertResult = await contactService.bulkInsertContacts(inputs);
        expect(insertResult.success).toBe(true);
        expect(insertResult.contacts).toHaveLength(3);

        // Step 2: Bulk update
        const updates: ContactUpdate[] = insertResult.contacts.map(
          (contact) => ({
            id: contact.id,
            company: "Updated Company",
            notes: "Updated during workflow test",
          }),
        );

        const updateResult = await contactService.bulkUpdateContacts(updates);
        expect(updateResult.success).toBe(true);
        expect(updateResult.contacts).toHaveLength(3);

        // Verify updates
        updateResult.contacts.forEach((contact) => {
          expect(contact.company).toBe("Updated Company");
          expect(contact.notes).toBe("Updated during workflow test");
        });

        // Step 3: Bulk delete
        const idsToDelete = updateResult.contacts.map((contact) => contact.id);
        const deleteResult =
          await contactService.bulkDeleteContacts(idsToDelete);
        expect(deleteResult.success).toBe(true);
        expect(deleteResult.deletedIds).toHaveLength(3);

        // Verify deletion
        for (const id of idsToDelete) {
          const contact = await contactService.getContact(id);
          expect(contact).toBeNull();
        }
      });
    });

    it("should maintain data integrity across bulk operations", async () => {
      await withContext({ db, embeddingsEnabled: false }, async () => {
        // Create initial contacts
        const inputs: ContactInput[] = Array.from({ length: 10 }, (_, i) => ({
          name: `Integrity Test ${i + 1}`,
          email: [`test${i + 1}@example.com`],
        }));

        const insertResult = await contactService.bulkInsertContacts(inputs);

        // Update half of them
        const updates: ContactUpdate[] = insertResult.contacts
          .slice(0, 5)
          .map((contact) => ({
            id: contact.id,
            title: "Updated Title",
          }));

        const updateResult = await contactService.bulkUpdateContacts(updates);

        // Delete the other half
        const idsToDelete = insertResult.contacts
          .slice(5)
          .map((contact) => contact.id);
        const deleteResult =
          await contactService.bulkDeleteContacts(idsToDelete);

        // Verify final state
        expect(updateResult.processedCount).toBe(5);
        expect(deleteResult.processedCount).toBe(5);

        // Check that updated contacts still exist and have correct data
        for (const updatedContact of updateResult.contacts) {
          const contact = await contactService.getContact(updatedContact.id);
          expect(contact).not.toBeNull();
          expect(contact?.title).toBe("Updated Title");
        }

        // Check that deleted contacts no longer exist
        for (const deletedId of deleteResult.deletedIds) {
          const contact = await contactService.getContact(deletedId);
          expect(contact).toBeNull();
        }
      });
    });
  });
});
