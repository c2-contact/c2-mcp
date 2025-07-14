import { AsyncLocalStorage } from "async_hooks";
import type { DbInstance } from "./database.js";

type AppContext = {
  db: DbInstance;
  embeddingsEnabled: boolean;
  aiBaseUrl?: string;
  embeddingsModel?: string;
};

const appContext = new AsyncLocalStorage<AppContext>();

export function getContext(): AppContext {
  const context = appContext.getStore();
  if (!context) {
    throw new Error("No app context found. Make sure to call withContext()");
  }
  return context;
}

export function getDb(): DbInstance {
  return getContext().db;
}

export function getEmbeddingsEnabled(): boolean {
  return getContext().embeddingsEnabled;
}

// Removed OpenAI API key support - now using Ollama only

export function getAIBaseUrl(): string | undefined {
  return getContext().aiBaseUrl;
}

export function getEmbeddingsModel(): string | undefined {
  return getContext().embeddingsModel;
}

export async function withContext<T>(
  context: AppContext,
  fn: () => Promise<T>,
): Promise<T> {
  return appContext.run(context, fn);
}
