import { describe, it, expect, beforeAll } from "bun:test";
import { createDbInstance } from "../src/database.js";
import { withContext } from "../src/context.js";
import { ContactService } from "../src/contact-service.js";
import type { ContactInput, ContactUpdate } from "../src/types.js";
import { checkOllamaHealth } from "../e2e/mcp-client.js";

describe("Embeddings with CRUD Operations Integration Tests", () => {
  let db: any;
  let contactService: ContactService;

  beforeAll(async () => {
    // Check if Ollama is running before starting tests
    await checkOllamaHealth("http://localhost:11434");

    db = await createDbInstance({ enableVector: true });
  });

  describe("Individual CRUD Operations with Embeddings", () => {
    it("should create contact with embeddings and enable semantic search", async () => {
      await withContext(
        {
          db,
          embeddingsEnabled: true,
          aiBaseUrl: "http://localhost:11434/v1",
          embeddingsModel: "mxbai-embed-large",
        },
        async () => {
          contactService = new ContactService();

          // Create a contact with specific expertise
          const aiExpert: ContactInput = {
            name: "Dr. Sarah AI",
            title: "AI Research Scientist",
            company: "DeepMind Research",
            email: ["sarah@deepmind.com"],
            tags: [
              "artificial-intelligence",
              "machine-learning",
              "neural-networks",
            ],
            notes:
              "Leading researcher in artificial intelligence and deep learning, specializing in transformer architectures and large language models.",
            location: "London, UK",
          };

          const createdContact = await contactService.createContact(aiExpert);
          expect(createdContact.id).toBeDefined();
          expect(createdContact.name).toBe("Dr. Sarah AI");

          // Wait a moment for embedding to be processed
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify semantic search can find this contact
          const searchResults = await contactService.searchContacts(
            "artificial intelligence researcher",
          );
          expect(searchResults.length).toBeGreaterThan(0);

          const foundContact = searchResults.find(
            (c) => c.id === createdContact.id,
          );
          expect(foundContact).toBeDefined();
          expect(foundContact?.name).toBe("Dr. Sarah AI");
        },
      );
    });

    it("should update contact and regenerate embeddings for semantic search", async () => {
      await withContext(
        {
          db,
          embeddingsEnabled: true,
          aiBaseUrl: "http://localhost:11434/v1",
          embeddingsModel: "mxbai-embed-large",
        },
        async () => {
          contactService = new ContactService();

          // Create initial contact
          const blockchainDev: ContactInput = {
            name: "Alex Crypto",
            title: "Blockchain Developer",
            company: "CryptoTech",
            notes:
              "Experienced blockchain developer working on smart contracts and DeFi protocols.",
          };

          const createdContact =
            await contactService.createContact(blockchainDev);

          // Wait for initial embedding
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Update contact to change expertise area
          const update: ContactUpdate = {
            id: createdContact.id,
            title: "AI Engineer",
            company: "AI Startup",
            notes:
              "Transitioned to AI engineering, now working on machine learning models and neural networks.",
            tags: ["ai", "machine-learning", "python"],
          };

          const updatedContact = await contactService.updateContact(update);
          expect(updatedContact).not.toBeNull();
          expect(updatedContact?.title).toBe("AI Engineer");

          // Wait for embedding update
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify semantic search reflects the update
          const aiResults = await contactService.searchContacts(
            "machine learning engineer",
          );
          const blockchainResults = await contactService.searchContacts(
            "blockchain developer",
          );

          const foundInAI = aiResults.find((c) => c.id === createdContact.id);
          const foundInBlockchain = blockchainResults.find(
            (c) => c.id === createdContact.id,
          );

          // Should be found in AI search (new expertise)
          expect(foundInAI).toBeDefined();

          // May or may not be found in blockchain search depending on similarity threshold
          // The important thing is that the embedding was updated
          expect(aiResults.length).toBeGreaterThan(0);
        },
      );
    });

    it("should delete contact and remove from semantic search", async () => {
      await withContext(
        {
          db,
          embeddingsEnabled: true,
          aiBaseUrl: "http://localhost:11434/v1",
          embeddingsModel: "mxbai-embed-large",
        },
        async () => {
          contactService = new ContactService();

          // Create a contact
          const dataScientist: ContactInput = {
            name: "Dr. Data Science",
            title: "Senior Data Scientist",
            company: "Analytics Corp",
            notes:
              "Expert in statistical analysis, predictive modeling, and data visualization.",
            tags: ["data-science", "statistics", "python", "r"],
          };

          const createdContact =
            await contactService.createContact(dataScientist);

          // Wait for embedding creation
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify contact can be found via semantic search
          const beforeDeleteResults = await contactService.searchContacts(
            "data science expert",
          );
          const foundBeforeDelete = beforeDeleteResults.find(
            (c) => c.id === createdContact.id,
          );
          expect(foundBeforeDelete).toBeDefined();

          // Delete the contact
          const deleteResult = await contactService.deleteContact(
            createdContact.id,
          );
          expect(deleteResult).toBe(true);

          // Wait for deletion to propagate
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Verify contact is no longer found via semantic search
          const afterDeleteResults = await contactService.searchContacts(
            "data science expert",
          );
          const foundAfterDelete = afterDeleteResults.find(
            (c) => c.id === createdContact.id,
          );
          expect(foundAfterDelete).toBeUndefined();

          // Also verify direct retrieval returns null
          const retrievedContact = await contactService.getContact(
            createdContact.id,
          );
          expect(retrievedContact).toBeNull();
        },
      );
    });
  });

  describe("Bulk Operations with Embeddings", () => {
    it("should bulk insert contacts with embeddings and enable semantic search", async () => {
      await withContext(
        {
          db,
          embeddingsEnabled: true,
          aiBaseUrl: "http://localhost:11434/v1",
          embeddingsModel: "mxbai-embed-large",
        },
        async () => {
          contactService = new ContactService();

          const techExperts: ContactInput[] = [
            {
              name: "Frontend React Expert",
              title: "Senior Frontend Developer",
              company: "React Corp",
              notes:
                "Expert in React, TypeScript, and modern frontend development. Builds scalable user interfaces.",
              tags: ["react", "typescript", "frontend", "javascript"],
            },
            {
              name: "Backend Node Expert",
              title: "Backend Engineer",
              company: "Node Systems",
              notes:
                "Specializes in Node.js, Express, and microservices architecture. Expert in API development.",
              tags: ["nodejs", "express", "backend", "apis"],
            },
            {
              name: "DevOps Kubernetes Expert",
              title: "DevOps Engineer",
              company: "Cloud Native Inc",
              notes:
                "Expert in Kubernetes, Docker, and cloud infrastructure. Manages large-scale deployments.",
              tags: ["kubernetes", "docker", "devops", "cloud"],
            },
          ];

          const bulkResult =
            await contactService.bulkInsertContacts(techExperts);
          expect(bulkResult.success).toBe(true);
          expect(bulkResult.processedCount).toBe(3);
          expect(bulkResult.contacts).toHaveLength(3);

          // Wait for all embeddings to be processed
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Test semantic search for each expertise area
          const reactResults = await contactService.searchContacts(
            "React frontend developer",
          );
          const nodeResults = await contactService.searchContacts(
            "Node.js backend engineer",
          );
          const kubernetesResults = await contactService.searchContacts(
            "Kubernetes DevOps expert",
          );

          // Verify each contact can be found via semantic search
          const reactExpert = reactResults.find(
            (c) => c.name === "Frontend React Expert",
          );
          const nodeExpert = nodeResults.find(
            (c) => c.name === "Backend Node Expert",
          );
          const devopsExpert = kubernetesResults.find(
            (c) => c.name === "DevOps Kubernetes Expert",
          );

          expect(reactExpert).toBeDefined();
          expect(nodeExpert).toBeDefined();
          expect(devopsExpert).toBeDefined();

          // Test cross-domain search to verify embeddings capture semantic meaning
          const fullStackResults = await contactService.searchContacts(
            "full stack developer",
          );
          expect(fullStackResults.length).toBeGreaterThan(0);
        },
      );
    });

    it("should bulk update contacts and regenerate embeddings", async () => {
      await withContext(
        {
          db,
          embeddingsEnabled: true,
          aiBaseUrl: "http://localhost:11434/v1",
          embeddingsModel: "mxbai-embed-large",
        },
        async () => {
          contactService = new ContactService();

          // First create some contacts
          const initialContacts: ContactInput[] = [
            {
              name: "Junior Developer A",
              title: "Junior Developer",
              company: "Startup A",
              notes:
                "Entry-level developer learning the basics of programming.",
            },
            {
              name: "Junior Developer B",
              title: "Junior Developer",
              company: "Startup B",
              notes: "New graduate starting career in software development.",
            },
          ];

          const insertResult =
            await contactService.bulkInsertContacts(initialContacts);
          expect(insertResult.success).toBe(true);

          // Wait for initial embeddings
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Update them to senior positions with new expertise
          const updates: ContactUpdate[] = insertResult.contacts.map(
            (contact, index) => ({
              id: contact.id,
              title: "Senior AI Engineer",
              notes: `Promoted to senior AI engineer with expertise in machine learning and deep learning. Leading AI projects and mentoring junior developers.`,
              tags: ["ai", "machine-learning", "senior", "leadership"],
            }),
          );

          const updateResult = await contactService.bulkUpdateContacts(updates);
          expect(updateResult.success).toBe(true);
          expect(updateResult.processedCount).toBe(2);

          // Wait for embedding updates
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Verify semantic search reflects the updates
          const seniorAIResults = await contactService.searchContacts(
            "senior AI engineer machine learning",
          );
          const juniorResults = await contactService.searchContacts(
            "junior developer entry level",
          );

          // Should find both contacts in senior AI search
          const foundSeniorA = seniorAIResults.find(
            (c) => c.name === "Junior Developer A",
          );
          const foundSeniorB = seniorAIResults.find(
            (c) => c.name === "Junior Developer B",
          );

          expect(foundSeniorA).toBeDefined();
          expect(foundSeniorB).toBeDefined();

          // Verify the updated content is reflected
          expect(foundSeniorA?.title).toBe("Senior AI Engineer");
          expect(foundSeniorB?.title).toBe("Senior AI Engineer");
        },
      );
    });

    it("should bulk delete contacts and remove from semantic search", async () => {
      await withContext(
        {
          db,
          embeddingsEnabled: true,
          aiBaseUrl: "http://localhost:11434/v1",
          embeddingsModel: "mxbai-embed-large",
        },
        async () => {
          contactService = new ContactService();

          // Create contacts to be deleted
          const temporaryContacts: ContactInput[] = [
            {
              name: "Temp Designer A",
              title: "UI/UX Designer",
              company: "Design Studio",
              notes:
                "Temporary designer working on user interface and user experience design.",
              tags: ["design", "ui", "ux", "temporary"],
            },
            {
              name: "Temp Designer B",
              title: "Graphic Designer",
              company: "Creative Agency",
              notes:
                "Freelance graphic designer creating visual content and branding materials.",
              tags: ["design", "graphics", "branding", "freelance"],
            },
            {
              name: "Temp Designer C",
              title: "Product Designer",
              company: "Product Co",
              notes:
                "Product designer focusing on user-centered design and design systems.",
              tags: ["design", "product", "user-centered", "systems"],
            },
          ];

          const insertResult =
            await contactService.bulkInsertContacts(temporaryContacts);
          expect(insertResult.success).toBe(true);

          // Wait for embeddings to be created
          await new Promise((resolve) => setTimeout(resolve, 400));

          // Verify contacts can be found via semantic search
          const beforeDeleteResults = await contactService.searchContacts(
            "designer user interface",
          );
          const foundBeforeDelete = beforeDeleteResults.filter((c) =>
            c.name.startsWith("Temp Designer"),
          );
          expect(foundBeforeDelete.length).toBeGreaterThan(0);

          // Bulk delete the contacts
          const idsToDelete = insertResult.contacts.map((c) => c.id);
          const deleteResult =
            await contactService.bulkDeleteContacts(idsToDelete);

          expect(deleteResult.success).toBe(true);
          expect(deleteResult.processedCount).toBe(3);
          expect(deleteResult.deletedIds).toHaveLength(3);

          // Wait for deletions to propagate
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Verify contacts are no longer found via semantic search
          const afterDeleteResults = await contactService.searchContacts(
            "designer user interface",
          );
          const foundAfterDelete = afterDeleteResults.filter((c) =>
            c.name.startsWith("Temp Designer"),
          );
          expect(foundAfterDelete).toHaveLength(0);

          // Verify direct retrieval returns null for all deleted contacts
          for (const id of idsToDelete) {
            const retrievedContact = await contactService.getContact(id);
            expect(retrievedContact).toBeNull();
          }
        },
      );
    });

    it("should handle large bulk operations with embeddings efficiently", async () => {
      await withContext(
        {
          db,
          embeddingsEnabled: true,
          aiBaseUrl: "http://localhost:11434/v1",
          embeddingsModel: "mxbai-embed-large",
        },
        async () => {
          contactService = new ContactService();

          // Create a larger dataset
          const largeDataset: ContactInput[] = Array.from(
            { length: 15 },
            (_, i) => ({
              name: `Engineer ${i + 1}`,
              title: `Software Engineer ${i + 1}`,
              company: `Tech Company ${i + 1}`,
              notes: `Software engineer with ${i + 1} years of experience in web development, specializing in ${i % 2 === 0 ? "frontend" : "backend"} technologies.`,
              tags: [
                "software-engineering",
                i % 2 === 0 ? "frontend" : "backend",
                "web-development",
                `experience-${i + 1}`,
              ],
            }),
          );

          const startTime = Date.now();
          const bulkResult =
            await contactService.bulkInsertContacts(largeDataset);
          const endTime = Date.now();

          expect(bulkResult.success).toBe(true);
          expect(bulkResult.processedCount).toBe(15);
          expect(bulkResult.contacts).toHaveLength(15);

          console.log(
            `Bulk insert of 15 contacts with embeddings took ${endTime - startTime}ms`,
          );

          // Wait for all embeddings to be processed
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Test semantic search across the dataset
          const frontendResults = await contactService.searchContacts(
            "frontend web developer",
          );
          const backendResults = await contactService.searchContacts(
            "backend software engineer",
          );
          const experiencedResults = await contactService.searchContacts(
            "experienced software engineer",
          );

          expect(frontendResults.length).toBeGreaterThan(0);
          expect(backendResults.length).toBeGreaterThan(0);
          expect(experiencedResults.length).toBeGreaterThan(0);

          // Verify we can find specific engineers
          const foundFrontend = frontendResults.filter((c) =>
            c.name.startsWith("Engineer"),
          );
          const foundBackend = backendResults.filter((c) =>
            c.name.startsWith("Engineer"),
          );

          expect(foundFrontend.length).toBeGreaterThan(0);
          expect(foundBackend.length).toBeGreaterThan(0);

          // Clean up - bulk delete all created contacts
          const idsToDelete = bulkResult.contacts.map((c) => c.id);
          const deleteResult =
            await contactService.bulkDeleteContacts(idsToDelete);
          expect(deleteResult.success).toBe(true);
          expect(deleteResult.processedCount).toBe(15);
        },
      );
    });
  });

  describe("Error Handling with Embeddings", () => {
    it("should handle embedding failures gracefully during bulk operations", async () => {
      await withContext(
        {
          db,
          embeddingsEnabled: true,
          aiBaseUrl: "http://localhost:99999/v1", // Invalid URL to trigger failures
          embeddingsModel: "mxbai-embed-large",
        },
        async () => {
          contactService = new ContactService();

          const contacts: ContactInput[] = [
            {
              name: "Test Contact 1",
              title: "Engineer",
              notes: "This should still be created even if embeddings fail.",
            },
            {
              name: "Test Contact 2",
              title: "Designer",
              notes:
                "Another contact that should be created despite embedding failures.",
            },
          ];

          // Bulk insert should succeed even if embeddings fail
          const result = await contactService.bulkInsertContacts(contacts);

          expect(result.success).toBe(true);
          expect(result.processedCount).toBe(2);
          expect(result.contacts).toHaveLength(2);

          // Verify contacts were created (even without embeddings)
          for (const contact of result.contacts) {
            const retrieved = await contactService.getContact(contact.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.name).toBe(contact.name);
          }

          // Search should fall back to regular text search
          const searchResults = await contactService.searchContacts("Engineer");
          expect(Array.isArray(searchResults)).toBe(true);

          const foundContact = searchResults.find(
            (c) => c.name === "Test Contact 1",
          );
          expect(foundContact).toBeDefined();
        },
      );
    });

    it("should handle mixed embedding success/failure scenarios", async () => {
      await withContext(
        {
          db,
          embeddingsEnabled: true,
          aiBaseUrl: "http://localhost:11434/v1",
          embeddingsModel: "mxbai-embed-large",
        },
        async () => {
          contactService = new ContactService();

          // Create some contacts first
          const initialContacts: ContactInput[] = [
            {
              name: "Stable Contact 1",
              title: "Reliable Engineer",
              notes: "This contact should work fine with embeddings.",
            },
            {
              name: "Stable Contact 2",
              title: "Dependable Designer",
              notes: "Another stable contact for testing.",
            },
          ];

          const insertResult =
            await contactService.bulkInsertContacts(initialContacts);
          expect(insertResult.success).toBe(true);

          // Wait for embeddings
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Now test updates - some might fail embedding generation but contacts should still update
          const updates: ContactUpdate[] = insertResult.contacts.map(
            (contact) => ({
              id: contact.id,
              notes:
                "Updated notes that might or might not generate embeddings successfully.",
              tags: ["updated", "test"],
            }),
          );

          const updateResult = await contactService.bulkUpdateContacts(updates);
          expect(updateResult.success).toBe(true);
          expect(updateResult.processedCount).toBe(2);

          // Verify updates were applied regardless of embedding status
          for (const updatedContact of updateResult.contacts) {
            expect(updatedContact.notes).toBe(
              "Updated notes that might or might not generate embeddings successfully.",
            );
            expect(updatedContact.tags).toContain("updated");
          }
        },
      );
    });
  });

  describe("Embedding Consistency Verification", () => {
    it("should maintain embedding consistency between individual and bulk operations", async () => {
      await withContext(
        {
          db,
          embeddingsEnabled: true,
          aiBaseUrl: "http://localhost:11434/v1",
          embeddingsModel: "mxbai-embed-large",
        },
        async () => {
          contactService = new ContactService();

          const testData: ContactInput = {
            name: "Consistency Test Expert",
            title: "Machine Learning Engineer",
            company: "AI Research Lab",
            notes:
              "Expert in machine learning algorithms, neural networks, and artificial intelligence research.",
            tags: ["machine-learning", "ai", "research", "algorithms"],
          };

          // Create contact individually
          const individualContact =
            await contactService.createContact(testData);

          // Create same contact via bulk operation
          const bulkResult = await contactService.bulkInsertContacts([
            testData,
          ]);
          const bulkContact = bulkResult.contacts[0];

          // Wait for embeddings
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Both should be findable via the same semantic search
          const searchResults = await contactService.searchContacts(
            "machine learning AI researcher",
          );

          const foundIndividual = searchResults.find(
            (c) => c.id === individualContact.id,
          );
          const foundBulk = searchResults.find((c) => c.id === bulkContact.id);

          expect(foundIndividual).toBeDefined();
          expect(foundBulk).toBeDefined();

          // Both should have similar relevance (both should be in top results)
          const topResults = searchResults.slice(0, 5);
          const individualInTop = topResults.some(
            (c) => c.id === individualContact.id,
          );
          const bulkInTop = topResults.some((c) => c.id === bulkContact.id);

          expect(individualInTop).toBe(true);
          expect(bulkInTop).toBe(true);
        },
      );
    });
  });
});
