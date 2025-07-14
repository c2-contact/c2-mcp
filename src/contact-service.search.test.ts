import { describe, it, expect } from "bun:test";
import {
  createTestContext,
  sampleContactInput,
  sampleContactInput2,
} from "./test-helpers.js";

describe("ContactService.searchContacts", () => {
  it("should search contacts by name", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput); // John Doe
      await contactService.createContact(sampleContactInput2); // Jane Smith

      const contacts = await contactService.searchContacts("John");

      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.name).toBe("John Doe");
    });
  });

  it("should search contacts by company", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput); // Acme Corp
      await contactService.createContact(sampleContactInput2); // Tech Corp

      const contacts = await contactService.searchContacts("Acme");

      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.company).toBe("Acme Corp");
    });
  });

  it("should search contacts by notes", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "Developer",
        notes: "Specializes in React development",
      });
      await contactService.createContact({
        name: "Designer",
        notes: "Expert in UI/UX design",
      });

      const contacts = await contactService.searchContacts("React");

      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.name).toBe("Developer");
    });
  });

  it("should return multiple matches", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "John Developer",
        company: "Tech Corp",
      });
      await contactService.createContact({
        name: "Jane Developer",
        company: "Dev Corp",
      });
      await contactService.createContact({
        name: "Bob Designer",
        company: "Design Corp",
      });

      const contacts = await contactService.searchContacts("Developer");

      expect(contacts).toHaveLength(2);
      expect(contacts.map((c) => c.name)).toContain("John Developer");
      expect(contacts.map((c) => c.name)).toContain("Jane Developer");
    });
  });

  it("should handle case-insensitive search", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "John Doe",
        company: "ACME Corporation",
      });

      const contacts = await contactService.searchContacts("acme");

      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.name).toBe("John Doe");
    });
  });

  it("should return empty array for no matches", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);

      const contacts = await contactService.searchContacts("NonExistent");

      expect(contacts).toHaveLength(0);
      expect(Array.isArray(contacts)).toBe(true);
    });
  });

  it("should handle empty search query", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact(sampleContactInput);
      await contactService.createContact(sampleContactInput2);

      const contacts = await contactService.searchContacts("");

      // Empty query should return all contacts
      expect(contacts).toHaveLength(2);
    });
  });

  it("should handle special characters in search", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "José María",
        company: "Café & Co.",
      });

      const contacts = await contactService.searchContacts("José");

      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.name).toBe("José María");
    });
  });

  it("should search partial matches", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "JavaScript Developer",
        notes: "Expert in TypeScript and React",
      });

      const contacts = await contactService.searchContacts("Script");

      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.name).toBe("JavaScript Developer");
    });
  });

  it("should return results ordered by updatedAt descending", async () => {
    await createTestContext(async (contactService) => {
      const contact1 = await contactService.createContact({
        name: "First Developer",
      });

      // Wait to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const contact2 = await contactService.createContact({
        name: "Second Developer",
      });

      const contacts = await contactService.searchContacts("Developer");

      expect(contacts).toHaveLength(2);
      // Most recent should be first
      expect(contacts[0]?.id).toBe(contact2.id);
      expect(contacts[1]?.id).toBe(contact1.id);
    });
  });

  it("should handle SQL injection attempts in search queries", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "John Doe",
        company: "Safe Company",
      });

      const maliciousQueries = [
        "'; DROP TABLE contacts; --",
        "' OR 1=1 --",
        "'; DELETE FROM contacts; --",
        "' UNION SELECT * FROM contacts --",
      ];

      for (const query of maliciousQueries) {
        const contacts = await contactService.searchContacts(query);
        expect(Array.isArray(contacts)).toBe(true);
      }
    });
  });

  it("should handle regex special characters in search", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "Test User",
        company: "Company (Special) [Chars] {Here}",
        notes: "Notes with .* and +? characters",
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
        "[Chars]",
        "{Here}",
      ];

      for (const query of specialCharQueries) {
        const contacts = await contactService.searchContacts(query);
        expect(Array.isArray(contacts)).toBe(true);
      }
    });
  });

  it("should handle extremely long search queries", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "Test User",
        company: "Test Company",
      });

      const longQuery = "test".repeat(1000);
      const contacts = await contactService.searchContacts(longQuery);

      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts).toHaveLength(0);
    });
  });

  it("should handle whitespace-only search queries", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "Test User",
        company: "Test Company",
      });

      const whitespaceQueries = ["   ", "\t", "\n", "\r\n", " \t \n "];

      for (const query of whitespaceQueries) {
        const contacts = await contactService.searchContacts(query);
        expect(Array.isArray(contacts)).toBe(true);
      }
    });
  });

  it("should handle unicode and emoji in search queries", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "José María 👨‍💻",
        company: "Café & Co. 🏢",
        notes: "Unicode test: 中文 العربية עברית",
      });

      const unicodeQueries = [
        "José",
        "María",
        "👨‍💻",
        "Café",
        "🏢",
        "中文",
        "العربية",
        "עברית",
      ];

      for (const query of unicodeQueries) {
        const contacts = await contactService.searchContacts(query);
        expect(Array.isArray(contacts)).toBe(true);
      }
    });
  });

  it("should handle mixed case and diacritics in search", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "José María Ñoño",
        company: "Café & Résumé Co.",
      });

      const diacriticQueries = [
        "jose",
        "JOSE",
        "maria",
        "MARIA",
        "nono",
        "cafe",
        "resume",
      ];

      for (const query of diacriticQueries) {
        const contacts = await contactService.searchContacts(query);
        expect(Array.isArray(contacts)).toBe(true);
      }
    });
  });

  it("should handle null and undefined search queries gracefully", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "Test User",
      });

      // These should be handled gracefully without throwing
      const contacts1 = await contactService.searchContacts(null as any);
      const contacts2 = await contactService.searchContacts(undefined as any);

      expect(Array.isArray(contacts1)).toBe(true);
      expect(Array.isArray(contacts2)).toBe(true);
    });
  });

  it("should handle search queries with only punctuation", async () => {
    await createTestContext(async (contactService) => {
      await contactService.createContact({
        name: "Test User",
        company: "Test & Co.",
        notes: "Notes with @#$%^&*() symbols",
      });

      const punctuationQueries = [
        "!@#$%^&*()",
        ".,;:",
        "?!",
        "&",
        "@",
        "#",
        "%",
      ];

      for (const query of punctuationQueries) {
        const contacts = await contactService.searchContacts(query);
        expect(Array.isArray(contacts)).toBe(true);
      }
    });
  });
});
