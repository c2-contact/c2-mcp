import { describe, it, expect, beforeAll } from "bun:test";
import { createDbInstance } from "../src/database.js";
import { withContext } from "../src/context.js";
import { ContactService } from "../src/contact-service.js";
import { checkOllamaHealth } from "../e2e/mcp-client.js";

describe("Semantic Search Integration Tests", () => {
  let db: any;
  let contactService: ContactService;
  let createdContactIds: string[] = [];

  beforeAll(async () => {
    // Check if Ollama is running before starting tests
    await checkOllamaHealth("http://localhost:11434");

    db = await createDbInstance({ enableVector: true });

    // Create test contacts for semantic search
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();

        // Create test contacts that the tests expect
        const testContacts = [
          {
            name: "Alex Rodriguez",
            title: "DevOps Engineer",
            company: "CloudTech Solutions",
            notes:
              "Expert in Docker, Kubernetes, AWS, and cloud infrastructure. Specializes in container orchestration and CI/CD pipelines.",
            tags: ["devops", "kubernetes", "docker", "aws", "containers"],
          },
          {
            name: "Sarah Chen",
            title: "UX Designer",
            company: "Design Studio",
            notes:
              "Experienced in user interface design, user experience research, and design systems. Expert in Figma and Adobe Creative Suite.",
            tags: ["ux", "ui", "design", "figma", "user-experience"],
          },
          {
            name: "Marcus Johnson",
            title: "Frontend Developer",
            company: "WebDev Inc",
            notes:
              "Frontend developer specializing in React, TypeScript, and modern JavaScript frameworks. Expert in responsive design.",
            tags: [
              "frontend",
              "react",
              "typescript",
              "javascript",
              "web-development",
            ],
          },
          {
            name: "Lisa Wang",
            title: "Product Manager",
            company: "Strategy Corp",
            notes:
              "Product manager with extensive experience in product strategy, roadmap planning, and cross-functional team leadership.",
            tags: ["product-management", "strategy", "leadership", "planning"],
          },
        ];

        for (const contact of testContacts) {
          const created = await contactService.createContact(contact);
          createdContactIds.push(created.id);
        }
      },
    );
  });

  it("should find DevOps engineer when searching for container expertise", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();
        const results = await contactService.searchContacts(
          "someone who works with containers and cloud platforms",
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find Alex Rodriguez (DevOps Engineer)
        const devopsEngineer = results.find(
          (contact) => contact.name === "Alex Rodriguez",
        );
        expect(devopsEngineer).toBeDefined();
        expect(devopsEngineer?.title).toBe("DevOps Engineer");
      },
    );
  });

  it("should find UX designer when searching for user interface expertise", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,

        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();
        const results = await contactService.searchContacts(
          "person experienced in user interface design",
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find Sarah Chen (UX Designer)
        const uxDesigner = results.find(
          (contact) => contact.name === "Sarah Chen",
        );
        expect(uxDesigner).toBeDefined();
        expect(uxDesigner?.title).toBe("UX Designer");
      },
    );
  });

  it("should find frontend developer when searching for React expertise", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,

        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();
        const results = await contactService.searchContacts(
          "developer who knows frontend frameworks like React",
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find Marcus Johnson (Frontend Developer)
        const frontendDev = results.find(
          (contact) => contact.name === "Marcus Johnson",
        );
        expect(frontendDev).toBeDefined();
        expect(frontendDev?.title).toBe("Frontend Developer");
      },
    );
  });

  it("should find product manager when searching for strategy expertise", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,

        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();
        const results = await contactService.searchContacts(
          "manager with product strategy experience",
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find Lisa Wang (Product Manager)
        const productManager = results.find(
          (contact) => contact.name === "Lisa Wang",
        );
        expect(productManager).toBeDefined();
        expect(productManager?.title).toBe("Product Manager");
      },
    );
  });

  it("should return results ordered by relevance", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,

        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();
        const results = await contactService.searchContacts(
          "cloud infrastructure kubernetes",
        );

        expect(results.length).toBeGreaterThan(0);

        // The DevOps engineer should be the most relevant result
        expect(results[0]?.name).toBe("Alex Rodriguez");
        expect(results[0]?.title).toBe("DevOps Engineer");
      },
    );
  });
});

describe("Semantic Search Edge Cases", () => {
  let db: any;
  let contactService: ContactService;

  beforeAll(async () => {
    // Check if Ollama is running before starting tests
    await checkOllamaHealth("http://localhost:11434");

    // Initialize database with embeddings enabled
    db = await createDbInstance({ enableVector: true });
  });

  it("should handle Ollama service unavailable gracefully", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:99999/v1", // Invalid port
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();

        // Contact creation should still work even if embeddings fail
        const contact = await contactService.createContact({
          name: "Test User",
          title: "Software Engineer",
          notes: "This should work even without embeddings",
        });

        expect(contact.id).toBeDefined();
        expect(contact.name).toBe("Test User");

        // Search should fall back to regular text search
        const results = await contactService.searchContacts("Test");
        expect(Array.isArray(results)).toBe(true);
      },
    );
  });

  it("should handle invalid AI base URL gracefully", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "not-a-valid-url",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();

        const contact = await contactService.createContact({
          name: "Invalid URL Test",
          notes: "Testing with invalid AI base URL",
        });

        expect(contact.id).toBeDefined();
        expect(contact.name).toBe("Invalid URL Test");
      },
    );
  });

  it("should handle missing embeddings model gracefully", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "non-existent-model",
      },
      async () => {
        contactService = new ContactService();

        const contact = await contactService.createContact({
          name: "Missing Model Test",
          notes: "Testing with non-existent model",
        });

        expect(contact.id).toBeDefined();
        expect(contact.name).toBe("Missing Model Test");
      },
    );
  });

  it("should handle network timeout scenarios", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://httpstat.us/200?sleep=30000", // Simulates slow response
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();

        // This should complete quickly even if embeddings timeout
        const startTime = Date.now();
        const contact = await contactService.createContact({
          name: "Timeout Test",
          notes: "Testing network timeout handling",
        });
        const endTime = Date.now();

        expect(contact.id).toBeDefined();
        expect(contact.name).toBe("Timeout Test");
        // Should not take more than 10 seconds (reasonable timeout)
        expect(endTime - startTime).toBeLessThan(10000);
      },
    );
  });

  it("should handle malformed embedding responses", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://httpstat.us/200", // Returns non-JSON response
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();

        const contact = await contactService.createContact({
          name: "Malformed Response Test",
          notes: "Testing malformed API responses",
        });

        expect(contact.id).toBeDefined();
        expect(contact.name).toBe("Malformed Response Test");
      },
    );
  });

  it("should handle empty or null search queries with embeddings enabled", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();

        await contactService.createContact({
          name: "Empty Query Test",
          notes: "Testing empty search queries",
        });

        const emptyResults = await contactService.searchContacts("");
        const nullResults = await contactService.searchContacts(null as any);
        const undefinedResults = await contactService.searchContacts(
          undefined as any,
        );

        expect(Array.isArray(emptyResults)).toBe(true);
        expect(Array.isArray(nullResults)).toBe(true);
        expect(Array.isArray(undefinedResults)).toBe(true);
      },
    );
  });

  it("should handle very long search queries with embeddings", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();

        await contactService.createContact({
          name: "Long Query Test",
          notes: "Testing very long search queries with embeddings",
        });

        const longQuery = "software engineer with experience in ".repeat(100);
        const results = await contactService.searchContacts(longQuery);

        expect(Array.isArray(results)).toBe(true);
      },
    );
  });

  it("should find contact by semantic search on tag with pluralization edge case", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();
        // Create Tony Stark with tag 'Superhero'
        await contactService.createContact({
          name: "Tony Stark",
          tags: ["Superhero"],
        });
        // Search for 'superheros' (plural, common misspelling)
        const results = await contactService.searchContacts("superheros");
        // Should find Tony Stark (even with pluralization)
        const tony = results.find((c) => c.name === "Tony Stark");
        expect(tony).toBeDefined();
        expect(tony?.tags).toContain("Superhero");
      },
    );
  });

  it("should handle special characters in semantic search", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();

        await contactService.createContact({
          name: "Special Chars Test",
          notes: "Testing special characters: @#$%^&*(){}[]|\\:;\"'<>,.?/~`",
        });

        const specialQueries = [
          "@#$%^&*()",
          "{}[]|\\",
          ":;\"'<>,.?/~`",
          "SQL injection'; DROP TABLE contacts; --",
        ];

        for (const query of specialQueries) {
          const results = await contactService.searchContacts(query);
          expect(Array.isArray(results)).toBe(true);
        }
      },
    );
  });
});

describe("Semantic Search Stress Tests", () => {
  let db: any;
  let contactService: ContactService;
  let createdContactIds: string[] = [];

  // Comprehensive Silicon Valley dataset
  const siliconValleyContacts = [
    // Tech Founders & CEOs
    {
      name: "Elon Musk",
      title: "CEO & CTO",
      company: "SpaceX, Tesla, X Corp",
      email: ["elon@spacex.com", "elon@tesla.com"],
      phone: ["+1-650-555-0001"],
      links: ["https://x.com/elonmusk", "https://linkedin.com/in/elonmusk"],
      tags: [
        "entrepreneur",
        "space",
        "electric-vehicles",
        "ai",
        "neural-interfaces",
      ],
      notes:
        "Serial entrepreneur focused on sustainable transport, space exploration, and artificial intelligence. Founded PayPal, SpaceX, Tesla, Neuralink, and The Boring Company.",
      location: "Austin, TX",
    },
    {
      name: "Mark Zuckerberg",
      title: "CEO & Founder",
      company: "Meta Platforms",
      email: ["mark@meta.com"],
      phone: ["+1-650-555-0002"],
      links: [
        "https://facebook.com/zuck",
        "https://linkedin.com/in/markzuckerberg",
      ],
      tags: ["social-media", "vr", "ar", "metaverse", "ai"],
      notes:
        "Founded Facebook in college, now leading Meta's transition to the metaverse with VR/AR technologies and AI research.",
      location: "Menlo Park, CA",
    },
    {
      name: "Satya Nadella",
      title: "CEO",
      company: "Microsoft",
      email: ["satya@microsoft.com"],
      phone: ["+1-425-555-0003"],
      links: [
        "https://linkedin.com/in/satyanadella",
        "https://x.com/satyanadella",
      ],
      tags: ["cloud-computing", "ai", "enterprise-software", "leadership"],
      notes:
        "Transformed Microsoft into a cloud-first company, leading Azure growth and AI integration across all products.",
      location: "Redmond, WA",
    },
    {
      name: "Sundar Pichai",
      title: "CEO",
      company: "Alphabet Inc. (Google)",
      email: ["sundar@google.com"],
      phone: ["+1-650-555-0004"],
      links: [
        "https://linkedin.com/in/sundarpichai",
        "https://x.com/sundarpichai",
      ],
      tags: ["search", "ai", "cloud", "android", "chrome"],
      notes:
        "Leading Google's AI-first transformation, overseeing search, cloud, Android, and breakthrough AI research including LaMDA and Bard.",
      location: "Mountain View, CA",
    },
    {
      name: "Tim Cook",
      title: "CEO",
      company: "Apple Inc.",
      email: ["tim@apple.com"],
      phone: ["+1-408-555-0005"],
      links: ["https://linkedin.com/in/timcook", "https://x.com/tim_cook"],
      tags: ["consumer-electronics", "design", "privacy", "sustainability"],
      notes:
        "Leading Apple's focus on privacy, environmental sustainability, and expanding into services and wearables.",
      location: "Cupertino, CA",
    },
    {
      name: "Jensen Huang",
      title: "CEO & Founder",
      company: "NVIDIA",
      email: ["jensen@nvidia.com"],
      phone: ["+1-408-555-0006"],
      links: [
        "https://linkedin.com/in/jenhsunhuang",
        "https://x.com/jensenhuang",
      ],
      tags: ["gpu", "ai", "machine-learning", "gaming", "data-center"],
      notes:
        "Pioneering AI computing with GPUs, leading the AI revolution through CUDA, deep learning, and accelerated computing platforms.",
      location: "Santa Clara, CA",
    },
    {
      name: "Andy Jassy",
      title: "CEO",
      company: "Amazon",
      email: ["andy@amazon.com"],
      phone: ["+1-206-555-0007"],
      links: ["https://linkedin.com/in/andyjassy", "https://x.com/ajassy"],
      tags: ["cloud-computing", "aws", "e-commerce", "logistics"],
      notes:
        "Former AWS CEO now leading Amazon, expert in cloud infrastructure and enterprise services.",
      location: "Seattle, WA",
    },
    {
      name: "Brian Chesky",
      title: "CEO & Co-founder",
      company: "Airbnb",
      email: ["brian@airbnb.com"],
      phone: ["+1-415-555-0008"],
      links: ["https://linkedin.com/in/brianchesky", "https://x.com/bchesky"],
      tags: ["sharing-economy", "travel", "hospitality", "design"],
      notes:
        "Co-founded Airbnb, revolutionizing travel and hospitality through peer-to-peer home sharing platform.",
      location: "San Francisco, CA",
    },
    {
      name: "Daniel Ek",
      title: "CEO & Founder",
      company: "Spotify",
      email: ["daniel@spotify.com"],
      phone: ["+46-8-555-0009"],
      links: ["https://linkedin.com/in/danielek", "https://x.com/eldsjal"],
      tags: ["music-streaming", "audio", "podcasts", "subscription"],
      notes:
        "Founded Spotify, transforming music industry with streaming technology and personalized recommendations.",
      location: "Stockholm, Sweden",
    },
    {
      name: "Patrick Collison",
      title: "CEO & Co-founder",
      company: "Stripe",
      email: ["patrick@stripe.com"],
      phone: ["+1-415-555-0010"],
      links: [
        "https://linkedin.com/in/patrickcollison",
        "https://x.com/patrickc",
      ],
      tags: ["fintech", "payments", "apis", "developer-tools"],
      notes:
        "Co-founded Stripe with his brother, building internet infrastructure for online payments and financial services.",
      location: "San Francisco, CA",
    },

    // VCs and Investors
    {
      name: "Marc Andreessen",
      title: "Co-founder & General Partner",
      company: "Andreessen Horowitz (a16z)",
      email: ["marc@a16z.com"],
      phone: ["+1-650-555-0011"],
      links: ["https://linkedin.com/in/marcandreessen", "https://x.com/pmarca"],
      tags: ["venture-capital", "software", "crypto", "ai", "biotech"],
      notes:
        "Co-created Netscape browser, now leading a16z investments in software, crypto, AI, and biotech startups.",
      location: "Menlo Park, CA",
    },
    {
      name: "Ben Horowitz",
      title: "Co-founder & General Partner",
      company: "Andreessen Horowitz (a16z)",
      email: ["ben@a16z.com"],
      phone: ["+1-650-555-0012"],
      links: ["https://linkedin.com/in/benhorowitz", "https://x.com/bhorowitz"],
      tags: [
        "venture-capital",
        "enterprise-software",
        "management",
        "leadership",
      ],
      notes:
        "Former CEO turned VC, expert in enterprise software and management, co-founded a16z with Marc Andreessen.",
      location: "Menlo Park, CA",
    },
    {
      name: "Peter Thiel",
      title: "Founder",
      company: "Founders Fund",
      email: ["peter@foundersfund.com"],
      phone: ["+1-415-555-0013"],
      links: ["https://linkedin.com/in/peterthiel", "https://x.com/peterthiel"],
      tags: ["venture-capital", "paypal-mafia", "contrarian", "deep-tech"],
      notes:
        "PayPal co-founder, first Facebook investor, focuses on contrarian investments in deep technology and breakthrough innovations.",
      location: "San Francisco, CA",
    },
    {
      name: "Reid Hoffman",
      title: "Partner",
      company: "Greylock Partners",
      email: ["reid@greylock.com"],
      phone: ["+1-650-555-0014"],
      links: [
        "https://linkedin.com/in/reidhoffman",
        "https://x.com/reidhoffman",
      ],
      tags: ["venture-capital", "linkedin", "networks", "ai", "social"],
      notes:
        "LinkedIn founder, expert in network effects and social platforms, now investing in AI and future of work.",
      location: "Palo Alto, CA",
    },
    {
      name: "Mary Meeker",
      title: "Founder & General Partner",
      company: "Bond Capital",
      email: ["mary@bond.vc"],
      phone: ["+1-650-555-0015"],
      links: ["https://linkedin.com/in/marymeeker", "https://x.com/marymeeker"],
      tags: [
        "venture-capital",
        "internet-trends",
        "growth-investing",
        "consumer",
      ],
      notes:
        "Former Kleiner Perkins partner famous for Internet Trends report, now leading Bond Capital focusing on growth-stage companies.",
      location: "Menlo Park, CA",
    },

    // AI/ML Experts
    {
      name: "Sam Altman",
      title: "CEO",
      company: "OpenAI",
      email: ["sam@openai.com"],
      phone: ["+1-415-555-0021"],
      links: ["https://linkedin.com/in/samaltman", "https://x.com/sama"],
      tags: ["artificial-intelligence", "gpt", "agi", "safety", "research"],
      notes:
        "Leading OpenAI's mission to ensure AGI benefits humanity, former Y Combinator president with deep startup ecosystem knowledge.",
      location: "San Francisco, CA",
    },
    {
      name: "Dario Amodei",
      title: "CEO & Co-founder",
      company: "Anthropic",
      email: ["dario@anthropic.com"],
      phone: ["+1-415-555-0022"],
      links: [
        "https://linkedin.com/in/darioamodei",
        "https://x.com/darioamodei",
      ],
      tags: ["ai-safety", "constitutional-ai", "research", "ethics"],
      notes:
        "Former OpenAI research VP, co-founded Anthropic focusing on AI safety and constitutional AI approaches.",
      location: "San Francisco, CA",
    },
    {
      name: "Demis Hassabis",
      title: "CEO & Co-founder",
      company: "DeepMind (Google)",
      email: ["demis@deepmind.com"],
      phone: ["+44-20-555-0023"],
      links: [
        "https://linkedin.com/in/demishassabis",
        "https://x.com/demishassabis",
      ],
      tags: [
        "artificial-intelligence",
        "alphago",
        "protein-folding",
        "neuroscience",
      ],
      notes:
        "Co-founded DeepMind, achieved breakthrough AI milestones including AlphaGo and AlphaFold for protein structure prediction.",
      location: "London, UK",
    },
    {
      name: "Fei-Fei Li",
      title: "Professor & Co-director",
      company: "Stanford HAI",
      email: ["feifeili@stanford.edu"],
      phone: ["+1-650-555-0024"],
      links: ["https://linkedin.com/in/fei-fei-li", "https://x.com/drfeifei"],
      tags: ["computer-vision", "imagenet", "ai-ethics", "human-centered-ai"],
      notes:
        "Pioneer in computer vision and ImageNet, advocates for human-centered AI and diversity in tech.",
      location: "Stanford, CA",
    },
    {
      name: "Andrej Karpathy",
      title: "Founding Member",
      company: "OpenAI",
      email: ["andrej@openai.com"],
      phone: ["+1-415-555-0025"],
      links: [
        "https://linkedin.com/in/andrejkarpathy",
        "https://x.com/karpathy",
      ],
      tags: [
        "deep-learning",
        "computer-vision",
        "autonomous-driving",
        "education",
      ],
      notes:
        "Former Tesla AI director, OpenAI founding member, known for making AI education accessible through clear explanations.",
      location: "San Francisco, CA",
    },

    // Crypto/Web3 Leaders
    {
      name: "Brian Armstrong",
      title: "CEO & Co-founder",
      company: "Coinbase",
      email: ["brian@coinbase.com"],
      phone: ["+1-415-555-0026"],
      links: [
        "https://linkedin.com/in/barmstrong",
        "https://x.com/brian_armstrong",
      ],
      tags: ["cryptocurrency", "bitcoin", "ethereum", "defi", "regulation"],
      notes:
        "Co-founded Coinbase, leading cryptocurrency exchange focused on making crypto accessible and compliant.",
      location: "San Francisco, CA",
    },
    {
      name: "Changpeng Zhao",
      title: "Former CEO",
      company: "Binance",
      email: ["cz@binance.com"],
      phone: ["+65-555-0027"],
      links: ["https://linkedin.com/in/cpzhao", "https://x.com/cz_binance"],
      tags: ["cryptocurrency", "trading", "global-exchange", "blockchain"],
      notes:
        "Built Binance into world's largest crypto exchange, expert in high-frequency trading and blockchain infrastructure.",
      location: "Dubai, UAE",
    },
    {
      name: "Vitalik Buterin",
      title: "Co-founder",
      company: "Ethereum Foundation",
      email: ["vitalik@ethereum.org"],
      phone: ["+1-416-555-0028"],
      links: [
        "https://linkedin.com/in/vitalik-buterin",
        "https://x.com/vitalikbuterin",
      ],
      tags: [
        "ethereum",
        "smart-contracts",
        "blockchain",
        "decentralization",
        "research",
      ],
      notes:
        "Co-created Ethereum blockchain, pioneering smart contracts and decentralized applications ecosystem.",
      location: "Toronto, Canada",
    },

    // Enterprise Software Leaders
    {
      name: "Marc Benioff",
      title: "Chairman & CEO",
      company: "Salesforce",
      email: ["marc@salesforce.com"],
      phone: ["+1-415-555-0029"],
      links: ["https://linkedin.com/in/marcbenioff", "https://x.com/benioff"],
      tags: ["crm", "cloud-computing", "saas", "philanthropy", "equality"],
      notes:
        "Pioneered SaaS model with Salesforce CRM, advocate for equality and stakeholder capitalism.",
      location: "San Francisco, CA",
    },
    {
      name: "Aaron Levie",
      title: "CEO & Co-founder",
      company: "Box",
      email: ["aaron@box.com"],
      phone: ["+1-650-555-0030"],
      links: ["https://linkedin.com/in/aaronlevie", "https://x.com/levie"],
      tags: ["enterprise-storage", "collaboration", "security", "cloud"],
      notes:
        "Co-founded Box for enterprise cloud storage and collaboration, expert in enterprise software adoption.",
      location: "Redwood City, CA",
    },
    {
      name: "Dustin Moskovitz",
      title: "CEO & Co-founder",
      company: "Asana",
      email: ["dustin@asana.com"],
      phone: ["+1-415-555-0031"],
      links: [
        "https://linkedin.com/in/dustinmoskovitz",
        "https://x.com/moskov",
      ],
      tags: [
        "productivity",
        "project-management",
        "team-collaboration",
        "facebook-cofounder",
      ],
      notes:
        "Facebook co-founder who left to build Asana, focused on helping teams coordinate and achieve their goals.",
      location: "San Francisco, CA",
    },

    // Fintech Innovators
    {
      name: "Max Levchin",
      title: "CEO & Founder",
      company: "Affirm",
      email: ["max@affirm.com"],
      phone: ["+1-415-555-0032"],
      links: ["https://linkedin.com/in/maxlevchin", "https://x.com/mlevchin"],
      tags: [
        "fintech",
        "payments",
        "lending",
        "paypal-mafia",
        "fraud-detection",
      ],
      notes:
        "PayPal co-founder and fraud detection expert, now leading Affirm in honest financial products and transparent lending.",
      location: "San Francisco, CA",
    },
    {
      name: "John Collison",
      title: "President & Co-founder",
      company: "Stripe",
      email: ["john@stripe.com"],
      phone: ["+1-415-555-0033"],
      links: [
        "https://linkedin.com/in/johncollison",
        "https://x.com/collision",
      ],
      tags: [
        "fintech",
        "payments",
        "apis",
        "developer-experience",
        "global-commerce",
      ],
      notes:
        "Co-founded Stripe with his brother Patrick, focusing on developer experience and global payment infrastructure.",
      location: "San Francisco, CA",
    },
    {
      name: "Vlad Tenev",
      title: "CEO & Co-founder",
      company: "Robinhood",
      email: ["vlad@robinhood.com"],
      phone: ["+1-650-555-0034"],
      links: ["https://linkedin.com/in/vladtenev", "https://x.com/vladtenev"],
      tags: [
        "fintech",
        "trading",
        "democratization",
        "commission-free",
        "retail-investing",
      ],
      notes:
        "Co-founded Robinhood to democratize investing through commission-free trading and accessible financial services.",
      location: "Menlo Park, CA",
    },

    // E-commerce & Marketplace Leaders
    {
      name: "Tobias Lütke",
      title: "CEO & Founder",
      company: "Shopify",
      email: ["tobias@shopify.com"],
      phone: ["+1-613-555-0035"],
      links: ["https://linkedin.com/in/tobiasluetke", "https://x.com/tobi"],
      tags: ["e-commerce", "small-business", "entrepreneurship", "platforms"],
      notes:
        "Founded Shopify to empower entrepreneurs and small businesses with e-commerce tools and infrastructure.",
      location: "Ottawa, Canada",
    },
    {
      name: "Katrina Lake",
      title: "Founder & Former CEO",
      company: "Stitch Fix",
      email: ["katrina@stitchfix.com"],
      phone: ["+1-415-555-0036"],
      links: [
        "https://linkedin.com/in/katrinalake",
        "https://x.com/katrinalake",
      ],
      tags: ["fashion", "personalization", "data-science", "retail"],
      notes:
        "Founded Stitch Fix, combining data science with personal styling to revolutionize fashion retail.",
      location: "San Francisco, CA",
    },

    // Developer Tools & Infrastructure
    {
      name: "Nat Friedman",
      title: "Former CEO",
      company: "GitHub",
      email: ["nat@github.com"],
      phone: ["+1-415-555-0037"],
      links: [
        "https://linkedin.com/in/natfriedman",
        "https://x.com/natfriedman",
      ],
      tags: [
        "developer-tools",
        "open-source",
        "collaboration",
        "version-control",
      ],
      notes:
        "Former GitHub CEO who led Microsoft acquisition integration, expert in developer tools and open source communities.",
      location: "San Francisco, CA",
    },
    {
      name: "Mitchell Hashimoto",
      title: "Co-founder",
      company: "HashiCorp",
      email: ["mitchell@hashicorp.com"],
      phone: ["+1-415-555-0038"],
      links: [
        "https://linkedin.com/in/mitchellhashimoto",
        "https://x.com/mitchellh",
      ],
      tags: ["devops", "infrastructure", "terraform", "vagrant", "automation"],
      notes:
        "Co-founded HashiCorp, building infrastructure automation tools like Terraform, Vault, and Consul.",
      location: "San Francisco, CA",
    },
    {
      name: "Guillermo Rauch",
      title: "CEO & Founder",
      company: "Vercel",
      email: ["guillermo@vercel.com"],
      phone: ["+1-415-555-0039"],
      links: [
        "https://linkedin.com/in/guillermo-rauch",
        "https://x.com/rauchg",
      ],
      tags: [
        "frontend",
        "jamstack",
        "nextjs",
        "deployment",
        "developer-experience",
      ],
      notes:
        "Founded Vercel and created Next.js, pioneering modern frontend development and deployment platforms.",
      location: "San Francisco, CA",
    },

    // Media & Content
    {
      name: "Susan Wojcicki",
      title: "Former CEO",
      company: "YouTube",
      email: ["susan@youtube.com"],
      phone: ["+1-650-555-0040"],
      links: [
        "https://linkedin.com/in/susanwojcicki",
        "https://x.com/susanwojcicki",
      ],
      tags: [
        "video-platform",
        "content-creation",
        "advertising",
        "creator-economy",
      ],
      notes:
        "Led YouTube's growth into the world's largest video platform, pioneering the creator economy and video advertising.",
      location: "Los Altos, CA",
    },
    {
      name: "Kevin Systrom",
      title: "Co-founder",
      company: "Instagram",
      email: ["kevin@instagram.com"],
      phone: ["+1-415-555-0041"],
      links: ["https://linkedin.com/in/kevinsystrom", "https://x.com/kevin"],
      tags: [
        "social-media",
        "photography",
        "mobile-first",
        "visual-storytelling",
      ],
      notes:
        "Co-founded Instagram, pioneering mobile-first photo sharing and visual social media.",
      location: "San Francisco, CA",
    },

    // Healthcare & Biotech
    {
      name: "Elizabeth Holmes",
      title: "Former CEO",
      company: "Theranos (defunct)",
      email: ["elizabeth@theranos.com"],
      phone: ["+1-650-555-0042"],
      links: ["https://linkedin.com/in/elizabethholmes"],
      tags: ["biotech", "blood-testing", "healthcare", "fraud", "scandal"],
      notes:
        "Former Theranos CEO, cautionary tale about healthcare innovation claims and the importance of scientific rigor.",
      location: "Palo Alto, CA",
    },
    {
      name: "Patrick Soon-Shiong",
      title: "Executive Chairman",
      company: "NantWorks",
      email: ["patrick@nantworks.com"],
      phone: ["+1-310-555-0043"],
      links: [
        "https://linkedin.com/in/patricksoonshiong",
        "https://x.com/drpatricksoon",
      ],
      tags: [
        "healthcare",
        "precision-medicine",
        "cancer-research",
        "ai-healthcare",
      ],
      notes:
        "Surgeon and entrepreneur focused on precision medicine and AI-driven healthcare solutions.",
      location: "Los Angeles, CA",
    },

    // Transportation & Mobility
    {
      name: "Travis Kalanick",
      title: "Former CEO",
      company: "Uber",
      email: ["travis@uber.com"],
      phone: ["+1-415-555-0044"],
      links: [
        "https://linkedin.com/in/traviskalanick",
        "https://x.com/travisk",
      ],
      tags: ["ridesharing", "gig-economy", "disruption", "scaling"],
      notes:
        "Co-founded Uber, pioneered ridesharing industry and gig economy, known for aggressive growth tactics.",
      location: "Los Angeles, CA",
    },
    {
      name: "Dara Khosrowshahi",
      title: "CEO",
      company: "Uber",
      email: ["dara@uber.com"],
      phone: ["+1-415-555-0045"],
      links: [
        "https://linkedin.com/in/dara-khosrowshahi",
        "https://x.com/dkhos",
      ],
      tags: ["ridesharing", "logistics", "leadership", "turnaround"],
      notes:
        "Former Expedia CEO who led Uber's cultural transformation and path to profitability.",
      location: "San Francisco, CA",
    },

    // Gaming & Entertainment
    {
      name: "Gabe Newell",
      title: "Co-founder & President",
      company: "Valve Corporation",
      email: ["gabe@valvesoftware.com"],
      phone: ["+1-425-555-0046"],
      links: ["https://linkedin.com/in/gabenewell"],
      tags: ["gaming", "steam", "vr", "digital-distribution"],
      notes:
        "Co-founded Valve, created Steam platform revolutionizing PC gaming distribution and VR technology.",
      location: "Bellevue, WA",
    },
    {
      name: "Tim Sweeney",
      title: "CEO & Founder",
      company: "Epic Games",
      email: ["tim@epicgames.com"],
      phone: ["+1-919-555-0047"],
      links: [
        "https://linkedin.com/in/timsweeney",
        "https://x.com/timsweeneyepic",
      ],
      tags: ["gaming", "unreal-engine", "fortnite", "metaverse"],
      notes:
        "Founded Epic Games, created Unreal Engine and Fortnite, advocating for open metaverse and developer rights.",
      location: "Cary, NC",
    },

    // Additional Tech Leaders
    {
      name: "Palmer Luckey",
      title: "Founder",
      company: "Anduril Industries",
      email: ["palmer@anduril.com"],
      phone: ["+1-949-555-0048"],
      links: [
        "https://linkedin.com/in/palmerluckey",
        "https://x.com/palmerluckey",
      ],
      tags: ["vr", "defense-tech", "oculus", "autonomous-systems"],
      notes:
        "Founded Oculus VR, now building autonomous defense systems at Anduril Industries.",
      location: "Costa Mesa, CA",
    },
    {
      name: "Anthony Levandowski",
      title: "Founder",
      company: "Pronto AI",
      email: ["anthony@pronto.ai"],
      phone: ["+1-415-555-0049"],
      links: ["https://linkedin.com/in/anthonylevandowski"],
      tags: ["autonomous-vehicles", "lidar", "self-driving", "robotics"],
      notes:
        "Pioneer in autonomous vehicle technology, worked on Google's self-driving car project and founded multiple AV startups.",
      location: "San Francisco, CA",
    },
    {
      name: "Sebastian Thrun",
      title: "CEO & Founder",
      company: "Kitty Hawk",
      email: ["sebastian@kittyhawk.aero"],
      phone: ["+1-650-555-0050"],
      links: [
        "https://linkedin.com/in/sebastianthrun",
        "https://x.com/sebastianthrun",
      ],
      tags: [
        "autonomous-vehicles",
        "flying-cars",
        "ai",
        "education",
        "udacity",
      ],
      notes:
        "Led Google's self-driving car project, founded Udacity, now working on autonomous flying vehicles.",
      location: "Mountain View, CA",
    },
  ];

  beforeAll(async () => {
    // Check if Ollama is running before starting tests
    await checkOllamaHealth("http://localhost:11434");

    // Initialize database with embeddings enabled
    db = await createDbInstance({ enableVector: true });

    // Set up context with Ollama configuration
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        contactService = new ContactService();

        console.log(
          `Creating ${siliconValleyContacts.length} Silicon Valley contacts for stress testing...`,
        );

        // Create all test contacts
        for (const contactData of siliconValleyContacts) {
          try {
            const contact = await contactService.createContact(contactData);
            createdContactIds.push(contact.id);
            console.log(`✓ Created: ${contact.name} (${contact.company})`);
          } catch (error) {
            console.error(`✗ Failed to create ${contactData.name}:`, error);
          }
        }
      },
    );
  });

  it("should find AI/ML experts when searching for artificial intelligence", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        const startTime = Date.now();
        const results = await contactService.searchContacts(
          "artificial intelligence and machine learning experts",
        );
        const endTime = Date.now();

        console.log(
          `AI search took ${endTime - startTime}ms, found ${results.length} results`,
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find AI leaders like Sam Altman, Dario Amodei, Demis Hassabis, etc.
        const aiExperts = results.filter(
          (contact) =>
            contact.name.includes("Sam Altman") ||
            contact.name.includes("Dario Amodei") ||
            contact.name.includes("Demis Hassabis") ||
            contact.name.includes("Fei-Fei Li") ||
            contact.name.includes("Andrej Karpathy"),
        );

        expect(aiExperts.length).toBeGreaterThan(0);
        console.log(
          `Found AI experts: ${aiExperts.map((c) => c.name).join(", ")}`,
        );
      },
    );
  });

  it("should find venture capitalists when searching for investors", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        const startTime = Date.now();
        const results = await contactService.searchContacts(
          "venture capital investors and funding",
        );
        const endTime = Date.now();

        console.log(
          `VC search took ${endTime - startTime}ms, found ${results.length} results`,
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find VCs like Marc Andreessen, Ben Horowitz, Peter Thiel, etc.
        const vcs = results.filter(
          (contact) =>
            contact.name.includes("Marc Andreessen") ||
            contact.name.includes("Ben Horowitz") ||
            contact.name.includes("Peter Thiel") ||
            contact.name.includes("Reid Hoffman") ||
            contact.name.includes("Mary Meeker"),
        );

        expect(vcs.length).toBeGreaterThan(0);
        console.log(`Found VCs: ${vcs.map((c) => c.name).join(", ")}`);
      },
    );
  });

  it("should find fintech leaders when searching for payments and financial services", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        const startTime = Date.now();
        const results = await contactService.searchContacts(
          "payments fintech financial services",
        );
        const endTime = Date.now();

        console.log(
          `Fintech search took ${endTime - startTime}ms, found ${results.length} results`,
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find fintech leaders like Collison brothers, Max Levchin, etc.
        const fintechLeaders = results.filter(
          (contact) =>
            contact.name.includes("Patrick Collison") ||
            contact.name.includes("John Collison") ||
            contact.name.includes("Max Levchin") ||
            contact.name.includes("Vlad Tenev") ||
            contact.name.includes("Brian Armstrong"),
        );

        expect(fintechLeaders.length).toBeGreaterThan(0);
        console.log(
          `Found fintech leaders: ${fintechLeaders.map((c) => c.name).join(", ")}`,
        );
      },
    );
  });

  it("should find e-commerce experts when searching for online retail", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        const startTime = Date.now();
        const results = await contactService.searchContacts(
          "e-commerce online retail marketplace",
        );
        const endTime = Date.now();

        console.log(
          `E-commerce search took ${endTime - startTime}ms, found ${results.length} results`,
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find e-commerce leaders
        const ecommerceLeaders = results.filter(
          (contact) =>
            contact.name.includes("Tobias Lütke") ||
            contact.name.includes("Katrina Lake") ||
            contact.name.includes("Andy Jassy") ||
            contact.company.includes("Shopify") ||
            contact.company.includes("Amazon"),
        );

        expect(ecommerceLeaders.length).toBeGreaterThan(0);
        console.log(
          `Found e-commerce leaders: ${ecommerceLeaders.map((c) => c.name).join(", ")}`,
        );
      },
    );
  });

  it("should find social media pioneers when searching for social platforms", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        const startTime = Date.now();
        const results = await contactService.searchContacts(
          "social media platforms networking",
        );
        const endTime = Date.now();

        console.log(
          `Social media search took ${endTime - startTime}ms, found ${results.length} results`,
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find social media leaders
        const socialLeaders = results.filter(
          (contact) =>
            contact.name.includes("Mark Zuckerberg") ||
            contact.name.includes("Reid Hoffman") ||
            contact.name.includes("Kevin Systrom") ||
            contact.company.includes("Meta") ||
            contact.company.includes("LinkedIn"),
        );

        expect(socialLeaders.length).toBeGreaterThan(0);
        console.log(
          `Found social media leaders: ${socialLeaders.map((c) => c.name).join(", ")}`,
        );
      },
    );
  });

  it("should find gaming industry leaders when searching for video games", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        const startTime = Date.now();
        const results = await contactService.searchContacts(
          "video games gaming entertainment",
        );
        const endTime = Date.now();

        console.log(
          `Gaming search took ${endTime - startTime}ms, found ${results.length} results`,
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find gaming leaders
        const gamingLeaders = results.filter(
          (contact) =>
            contact.name.includes("Gabe Newell") ||
            contact.name.includes("Tim Sweeney") ||
            contact.company.includes("Valve") ||
            contact.company.includes("Epic Games"),
        );

        expect(gamingLeaders.length).toBeGreaterThan(0);
        console.log(
          `Found gaming leaders: ${gamingLeaders.map((c) => c.name).join(", ")}`,
        );
      },
    );
  });

  it("should find autonomous vehicle experts when searching for self-driving cars", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        const startTime = Date.now();
        const results = await contactService.searchContacts(
          "autonomous vehicles self-driving cars transportation",
        );
        const endTime = Date.now();

        console.log(
          `Autonomous vehicles search took ${endTime - startTime}ms, found ${results.length} results`,
        );

        expect(results.length).toBeGreaterThan(0);

        // Should find AV experts
        const avExperts = results.filter(
          (contact) =>
            contact.name.includes("Elon Musk") ||
            contact.name.includes("Anthony Levandowski") ||
            contact.name.includes("Sebastian Thrun") ||
            contact.company.includes("Tesla"),
        );

        expect(avExperts.length).toBeGreaterThan(0);
        console.log(
          `Found AV experts: ${avExperts.map((c) => c.name).join(", ")}`,
        );
      },
    );
  });

  it("should handle complex multi-faceted searches", async () => {
    await withContext(
      {
        db,
        embeddingsEnabled: true,
        aiBaseUrl: "http://localhost:11434/v1",
        embeddingsModel: "mxbai-embed-large",
      },
      async () => {
        const complexQueries = [
          "PayPal mafia members who became investors",
          "Stanford graduates in AI research",
          "Y Combinator alumni who raised over $100M",
          "Former Google employees who started companies",
          "CEOs who also code and write software",
        ];

        for (const query of complexQueries) {
          const startTime = Date.now();
          const results = await contactService.searchContacts(query);
          const endTime = Date.now();

          console.log(
            `Complex query "${query}" took ${endTime - startTime}ms, found ${results.length} results`,
          );
          expect(Array.isArray(results)).toBe(true);

          if (results.length > 0) {
            console.log(
              `  Top result: ${results[0]?.name} (${results[0]?.company})`,
            );
          }
        }
      },
    );
  });
});
