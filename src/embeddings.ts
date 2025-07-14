import { Ollama } from "ollama";
import { getAIBaseUrl, getEmbeddingsModel } from "./context.js";
import { logger } from "./logger.js";

// Default dimensions for mxbai-embed-large
export const EMBEDDING_DIMENSIONS = 1024;

export async function createEmbedding(
  text: string,
  options?: { baseUrl?: string; model?: string },
): Promise<number[]> {
  const baseUrl = options?.baseUrl || getAIBaseUrl();
  const model = options?.model || getEmbeddingsModel() || "mxbai-embed-large";

  // Extract host from baseUrl (remove /v1 suffix if present)
  let host = "http://localhost:11434";
  if (baseUrl) {
    try {
      const url = new URL(baseUrl);
      host = `${url.protocol}//${url.host}`;
    } catch (error) {
      logger.error(`Invalid AI base URL: ${baseUrl}, using default: ${host}`);
    }
  }

  const ollama = new Ollama({ host });

  try {
    const response = await ollama.embeddings({
      model,
      prompt: text,
    });

    return response.embedding;
  } catch (error) {
    logger.error(`Failed to create embedding: ${error}`);
    throw error;
  }
}

export function createContactEmbeddingText(contact: {
  name: string;
  title?: string;
  company?: string;
  email?: string[];
  phone?: string[];
  links?: string[];
  tags?: string[];
  notes?: string;
  location?: string;
}): string {
  const parts = [
    contact.name,
    contact.title,
    contact.company,
    contact.location,
    contact.notes,
    ...(contact.email || []),
    ...(contact.phone || []),
    ...(contact.links || []),
    ...(contact.tags || []),
  ].filter(Boolean);

  return parts.join(" ");
}
