import { describe, it, expect } from "bun:test";
import {
  createTestContext,
  sampleContactInput,
  sampleContactInput2,
} from "./test-helpers.js";

describe("ContactService.listContacts", () => {
  it("should return all contacts when no filters are provided", async () => {
    await createTestContext(async (contactService) => {
      // Create multiple contacts
      const contact1 = await contactService.createContact(sampleContactInput);
      const contact2 = await contactService.createContact(sampleContactInput2);

      const contacts = await contactService.listContacts();

      expect(contacts).toHaveLength(2);
      expect(contacts.map((c) => c.id)).toContain(contact1.id);
      expect(contacts.map((c) => c.id)).toContain(contact2.id);
    });
  });

  it("should return empty array when no contacts exist", async () => {
    await createTestContext(async (contactService) => {
      const contacts = await contactService.listContacts();

      expect(contacts).toHaveLength(0);
      expect(Array.isArray(contacts)).toBe(true);
    });
  });

  it("should filter contacts by query (name search)", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput); // John Doe
      await contactService.createContact(sampleContactInput2); // Jane Smith

      const contacts = await contactService.listContacts({ query: "John" });

      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.name).toBe("John Doe");
    });
  });

  it("should filter contacts by company via query", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput); // Acme Corp
      await contactService.createContact(sampleContactInput2); // Tech Corp

      const contacts = await contactService.listContacts({ query: "Acme" });

      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.company).toBe("Acme Corp");
    });
  });

  it("should search across all fields including email, tags, and links", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "John Doe",
        company: "Acme Corp",
        email: ["john@example.com"],
        tags: ["developer", "javascript"],
        links: ["https://github.com/johndoe"],
      });
      await contactService.createContact({
        name: "Jane Smith",
        company: "Tech Corp",
        email: ["jane@techcorp.com"],
        tags: ["designer", "ui"],
        links: ["https://dribbble.com/janesmith"],
      });

      // Test email search
      const emailResults = await contactService.listContacts({
        query: "techcorp",
      });
      expect(emailResults).toHaveLength(1);
      expect(emailResults[0]?.name).toBe("Jane Smith");

      // Test tags search
      const tagResults = await contactService.listContacts({
        query: "javascript",
      });
      expect(tagResults).toHaveLength(1);
      expect(tagResults[0]?.name).toBe("John Doe");

      // Test links search
      const linkResults = await contactService.listContacts({
        query: "github",
      });
      expect(linkResults).toHaveLength(1);
      expect(linkResults[0]?.name).toBe("John Doe");
    });
  });

  it("should respect limit parameter", async () => {
    await createTestContext(async (contactService) => {
      // Create 3 contacts
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);
      await contactService.createContact({ name: "Third Contact" });

      const contacts = await contactService.listContacts({ limit: 2 });

      expect(contacts).toHaveLength(2);
    });
  });

  it("should respect offset parameter", async () => {
    await createTestContext(async (contactService) => {
      // Create contacts in order with delays to ensure different timestamps
      const contact1 = await contactService.createContact({
        name: "First Contact",
      });
      await new Promise((resolve) => setTimeout(resolve, 10));

      const contact2 = await contactService.createContact({
        name: "Second Contact",
      });
      await new Promise((resolve) => setTimeout(resolve, 10));

      const contact3 = await contactService.createContact({
        name: "Third Contact",
      });

      // Get all contacts to verify order
      const allContacts = await contactService.listContacts();
      expect(allContacts).toHaveLength(3);
      // Most recent (contact3) should be first
      expect(allContacts[0]?.id).toBe(contact3.id);

      // Test offset: skip the first (most recent) contact
      const contacts = await contactService.listContacts({
        offset: 1,
        limit: 2,
      });

      expect(contacts).toHaveLength(2);
      // Should not contain the most recent contact (contact3)
      expect(contacts.map((c) => c.id)).not.toContain(contact3.id);
      // Should contain contact2 and contact1
      expect(contacts.map((c) => c.id)).toContain(contact2.id);
      expect(contacts.map((c) => c.id)).toContain(contact1.id);
    });
  });

  it("should return contacts ordered by updatedAt descending", async () => {
    await createTestContext(async (contactService) => {
      const contact1 = await contactService.createContact({
        name: "First Contact",
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const contact2 = await contactService.createContact({
        name: "Second Contact",
      });

      const contacts = await contactService.listContacts();

      expect(contacts).toHaveLength(2);
      // Most recent should be first
      expect(contacts[0]?.id).toBe(contact2.id);
      expect(contacts[1]?.id).toBe(contact1.id);
    });
  });

  it("should search in notes field", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "Test User",
        notes: "This person loves React development",
      });
      await contactService.createContact({
        name: "Another User",
        notes: "This person prefers Vue.js",
      });

      const contacts = await contactService.listContacts({ query: "React" });

      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.name).toBe("Test User");
    });
  });

  it("should handle case-insensitive search", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "John Doe",
        company: "ACME Corp",
      });

      const contacts = await contactService.listContacts({ query: "john" });

      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.name).toBe("John Doe");
    });
  });

  it("should return no results for non-matching filters", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);

      const contacts = await contactService.listContacts({
        query: "NonExistent",
      });

      expect(contacts).toHaveLength(0);
    });
  });

  it("should handle negative offset gracefully", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);

      // Should throw an error for negative offset
      expect(contactService.listContacts({ offset: -1 })).rejects.toThrow();
    });
  });

  it("should handle negative limit gracefully", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);

      const contacts = await contactService.listContacts({ limit: -1 });

      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThanOrEqual(0);
    });
  });

  it("should handle zero limit", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);

      const contacts = await contactService.listContacts({ limit: 0 });

      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts).toHaveLength(0);
    });
  });

  it("should handle extremely large offset", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);

      const contacts = await contactService.listContacts({ offset: 999999 });

      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts).toHaveLength(0);
    });
  });

  it("should handle extremely large limit", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);

      const contacts = await contactService.listContacts({ limit: 999999 });

      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThanOrEqual(0);
      expect(contacts.length).toBeLessThanOrEqual(2);
    });
  });

  it("should handle non-integer offset and limit values", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);

      // Should throw errors for non-integer values
      expect(
        contactService.listContacts({
          offset: 1.5 as any,
          limit: 2.7 as any,
        }),
      ).rejects.toThrow();

      expect(
        contactService.listContacts({
          offset: "invalid" as any,
          limit: "invalid" as any,
        }),
      ).rejects.toThrow();
    });
  });

  it("should handle null and undefined pagination parameters", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);

      const contacts1 = await contactService.listContacts({
        offset: null as any,
        limit: null as any,
      });
      const contacts2 = await contactService.listContacts({
        offset: undefined,
        limit: undefined,
      });

      expect(Array.isArray(contacts1)).toBe(true);
      expect(Array.isArray(contacts2)).toBe(true);
      expect(contacts1.length).toBeGreaterThanOrEqual(0);
      expect(contacts2.length).toBeGreaterThanOrEqual(0);
    });
  });

  it("should handle very long query strings", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);

      const longQuery = "test".repeat(1000);
      const contacts = await contactService.listContacts({ query: longQuery });

      expect(Array.isArray(contacts)).toBe(true);
    });
  });

  it("should handle query with SQL injection attempts", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);

      const maliciousQueries = [
        "'; DROP TABLE contacts; --",
        "' OR 1=1 --",
        "'; DELETE FROM contacts; --",
        "' UNION SELECT * FROM contacts --",
      ];

      for (const query of maliciousQueries) {
        const contacts = await contactService.listContacts({ query });
        expect(Array.isArray(contacts)).toBe(true);
      }
    });
  });

  it("should handle query with special regex characters", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "Test User",
        company: "Company (Special) [Chars] {Here}",
      });

      const specialCharQueries = [
        ".*",
        "+?",
        "^$",
        "{}",
        "()",
        "[]",
        "\\",
        "|",
        "Company (Special)",
      ];

      for (const query of specialCharQueries) {
        const contacts = await contactService.listContacts({ query });
        expect(Array.isArray(contacts)).toBe(true);
      }
    });
  });
});
