import { describe, it, expect } from "bun:test";
import { createTestContext, sampleContactInput } from "./test-helpers.js";

describe("ContactService.createContact", () => {
  it("should create a contact with all fields", async () => {
    await createTestContext(async (contactService) => {
      const contact = await contactService.createContact(sampleContactInput);

      expect(contact.id).toBeDefined();
      expect(typeof contact.id).toBe("string");
      expect(contact.name).toBe(sampleContactInput.name);
      expect(contact.title).toBe(sampleContactInput.title!);
      expect(contact.company).toBe(sampleContactInput.company!);
      expect(contact.email).toEqual(sampleContactInput.email!);
      expect(contact.phone).toEqual(sampleContactInput.phone!);
      expect(contact.links).toEqual(sampleContactInput.links!);
      expect(contact.tags).toEqual(sampleContactInput.tags!);
      expect(contact.notes).toBe(sampleContactInput.notes!);
      expect(contact.location).toBe(sampleContactInput.location!);
      expect(contact.birthdate).toBe(sampleContactInput.birthdate!);
      expect(contact.createdAt).toBeInstanceOf(Date);
      expect(contact.updatedAt).toBeInstanceOf(Date);
    });
  });

  it("should create a contact with minimal required fields", async () => {
    await createTestContext(async (contactService) => {
      const minimalInput = {
        name: "Minimal Contact",
      };

      const contact = await contactService.createContact(minimalInput);

      expect(contact.id).toBeDefined();
      expect(contact.name).toBe("Minimal Contact");
      expect(contact.title).toBe("");
      expect(contact.company).toBe("");
      expect(contact.email).toEqual([]);
      expect(contact.phone).toEqual([]);
      expect(contact.links).toEqual([]);
      expect(contact.tags).toEqual([]);
      expect(contact.notes).toBe("");
      expect(contact.location).toBe("");
      expect(contact.birthdate).toBeNull();
    });
  });

  it("should create a contact with empty arrays for optional fields", async () => {
    await createTestContext(async (contactService) => {
      const inputWithEmptyArrays = {
        name: "Test Contact",
        email: [],
        phone: [],
        links: [],
        tags: [],
      };

      const contact = await contactService.createContact(inputWithEmptyArrays);

      expect(contact.email).toEqual([]);
      expect(contact.phone).toEqual([]);
      expect(contact.links).toEqual([]);
      expect(contact.tags).toEqual([]);
    });
  });

  it("should handle special characters in contact fields", async () => {
    await createTestContext(async (contactService) => {
      const specialInput = {
        name: "José María O'Connor",
        company: "Café & Co.",
        notes: "Special chars: àáâãäåæçèéêë & symbols: @#$%^&*()",
        location: "São Paulo, Brazil",
      };

      const contact = await contactService.createContact(specialInput);

      expect(contact.name).toBe(specialInput.name);
      expect(contact.company).toBe(specialInput.company);
      expect(contact.notes).toBe(specialInput.notes);
      expect(contact.location).toBe(specialInput.location);
    });
  });

  it("should set createdAt and updatedAt to the same time on creation", async () => {
    await createTestContext(async (contactService) => {
      const contact = await contactService.createContact({ name: "Time Test" });

      expect(contact.createdAt).toBeInstanceOf(Date);
      expect(contact.updatedAt).toBeInstanceOf(Date);
      // Should be within 1 second of each other
      expect(
        Math.abs(contact.createdAt.getTime() - contact.updatedAt.getTime()),
      ).toBeLessThan(1000);
    });
  });

  it("should handle potential SQL injection attempts safely", async () => {
    await createTestContext(async (contactService) => {
      const maliciousInput = {
        name: "'; DROP TABLE contacts; --",
        company: "'; DELETE FROM contacts WHERE 1=1; --",
        notes: "'; INSERT INTO contacts (name) VALUES ('hacked'); --",
        location: "'; UPDATE contacts SET name='pwned'; --",
      };

      const contact = await contactService.createContact(maliciousInput);

      expect(contact.id).toBeDefined();
      expect(contact.name).toBe("'; DROP TABLE contacts; --");
      expect(contact.company).toBe("'; DELETE FROM contacts WHERE 1=1; --");
      expect(contact.notes).toBe(
        "'; INSERT INTO contacts (name) VALUES ('hacked'); --",
      );
      expect(contact.location).toBe("'; UPDATE contacts SET name='pwned'; --");
    });
  });

  it("should handle XSS attempts in input fields", async () => {
    await createTestContext(async (contactService) => {
      const xssInput = {
        name: "<script>alert('xss')</script>",
        company: "<img src=x onerror=alert('xss')>",
        notes: "javascript:alert('xss')",
        location: "<svg onload=alert('xss')>",
      };

      const contact = await contactService.createContact(xssInput);

      expect(contact.name).toBe("<script>alert('xss')</script>");
      expect(contact.company).toBe("<img src=x onerror=alert('xss')>");
      expect(contact.notes).toBe("javascript:alert('xss')");
      expect(contact.location).toBe("<svg onload=alert('xss')>");
    });
  });

  it("should handle extremely long input strings", async () => {
    await createTestContext(async (contactService) => {
      const longString = "a".repeat(10000);
      const longInput = {
        name: longString,
        company: longString,
        notes: longString,
        location: longString,
      };

      const contact = await contactService.createContact(longInput);

      expect(contact.name).toBe(longString);
      expect(contact.company).toBe(longString);
      expect(contact.notes).toBe(longString);
      expect(contact.location).toBe(longString);
    });
  });

  it("should handle invalid email formats gracefully", async () => {
    await createTestContext(async (contactService) => {
      const invalidEmailInput = {
        name: "Test User",
        email: [
          "not-an-email",
          "",
          "missing@",
          "@missing.com",
          "spaces in@email.com",
        ],
      };

      const contact = await contactService.createContact(invalidEmailInput);

      expect(contact.email).toEqual([
        "not-an-email",
        "",
        "missing@",
        "@missing.com",
        "spaces in@email.com",
      ]);
    });
  });

  it("should handle invalid date formats", async () => {
    await createTestContext(async (contactService) => {
      const invalidDateInput = {
        name: "Test User",
        birthdate: "not-a-date",
      };

      // Should throw an error for invalid date format
      expect(contactService.createContact(invalidDateInput)).rejects.toThrow();
    });
  });

  it("should handle invalid URL formats in links", async () => {
    await createTestContext(async (contactService) => {
      const invalidUrlInput = {
        name: "Test User",
        links: ["not-a-url", "javascript:alert('xss')", "", "ftp://invalid"],
      };

      const contact = await contactService.createContact(invalidUrlInput);

      expect(contact.links).toEqual([
        "not-a-url",
        "javascript:alert('xss')",
        "",
        "ftp://invalid",
      ]);
    });
  });

  it("should handle unicode and emoji characters", async () => {
    await createTestContext(async (contactService) => {
      const unicodeInput = {
        name: "👨‍💻 José María 测试 🚀",
        company: "🏢 Café & Co. 株式会社",
        notes: "Unicode test: àáâãäåæçèéêë 中文 العربية עברית 🎉",
        location: "São Paulo, Brasil 🇧🇷",
      };

      const contact = await contactService.createContact(unicodeInput);

      expect(contact.name).toBe("👨‍💻 José María 测试 🚀");
      expect(contact.company).toBe("🏢 Café & Co. 株式会社");
      expect(contact.notes).toBe(
        "Unicode test: àáâãäåæçèéêë 中文 العربية עברית 🎉",
      );
      expect(contact.location).toBe("São Paulo, Brasil 🇧🇷");
    });
  });

  it("should handle empty string vs null vs undefined differences", async () => {
    await createTestContext(async (contactService) => {
      const emptyStringInput = {
        name: "Empty String Test",
        title: "",
        company: "",
        notes: "",
        location: "",
      };

      const contact = await contactService.createContact(emptyStringInput);

      expect(contact.title).toBe("");
      expect(contact.company).toBe("");
      expect(contact.notes).toBe("");
      expect(contact.location).toBe("");
      expect(contact.birthdate).toBeNull();
    });
  });
});
