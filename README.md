# c2-mcp

A Model Context Protocol (MCP) server for contact management, powered by [pglite](https://pglite.dev/docs) (embedded Postgres/SQLite hybrid) and [Ollama](https://ollama.com/) for AI-powered embeddings and semantic search.

## Features

- **MCP server**: Implements the Model Context Protocol for tool-based automation and agent integration.
- **Contact management**: Create, read, update, delete, list, and search contacts.
- **Bulk operations**: Bulk create, update, and delete contacts.
- **Semantic search**: Find contacts using vector embeddings and similarity search (via Ollama).
- **Configurable**: Database location, AI base URL, and embeddings model are all configurable.

## Requirements

- [Bun](https://bun.sh) (v1.2.18 or later recommended)
- [Ollama](https://ollama.com/) running locally or accessible via HTTP (default: `http://localhost:11434`)

## Installation

```bash
bun install
```

## Running the Server

```bash
bun run index.ts
```

### Configuration

You can configure the server using environment variables or command-line arguments:

- `DB_PATH` or `--db-path=...` — Path to the database directory (default: `./db` in storage dir)
- `AI_BASE_URL` or `--ai-base-url=...` — Base URL for the Ollama API (default: `http://localhost:11434/v1`)
- `EMBEDDINGS_MODEL` or `--embeddings-model=...` — Embeddings model to use (default: `mxbai-embed-large`)

Example:

```bash
DB_PATH=./mydb AI_BASE_URL=http://localhost:11434/v1 EMBEDDINGS_MODEL=mxbai-embed-large bun run index.ts
```

## Main Tools/Endpoints

The MCP server exposes the following tools:

- `create-contact` — Create a new contact
- `get-contact` — Get a contact by ID
- `list-contacts` — List all contacts (with pagination)
- `search-contacts` — Search contacts by name, email, or phone
- `update-contact` — Update an existing contact
- `delete-contact` — Delete a contact by ID
- `semantic-search-contacts` — Semantic search using embeddings
- `bulk-create-contacts` — Bulk create contacts
- `bulk-update-contacts` — Bulk update contacts
- `bulk-delete-contacts` — Bulk delete contacts

## Development

- The project uses [drizzle-orm](https://orm.drizzle.team/) for database access and migrations.
- Database migrations are stored in the `drizzle/` directory and run automatically on startup.
- Embeddings are generated via the Ollama API and stored in the database for semantic search.

## Project Structure

- `index.ts` — Main entrypoint, server setup
- `src/contact-service.ts` — Contact management logic
- `src/database.ts` — Database setup (pglite)
- `src/embeddings.ts` — Embedding generation (Ollama)
- `src/context.ts` — Context and configuration helpers
- `drizzle/` — Database migrations
- `integration/`, `e2e/`, `src/*.test.ts` — Tests

## License

MIT

---

This project was created using `bun init` in bun v1.2.18. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
