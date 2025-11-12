import { IStorageAdapter } from "../../domain/ports/IStorageAdapter";
import { MemoryItem } from "../../domain/models/MemoryItem";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

interface PgMemoryRow {
  id: string;
  type: string;
  content: string;
  embedding_text?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string | null;
  relevance?: number | null;
  source?: string | null;
}

type ExecResultRows = { rows: PgMemoryRow[] };
type ExecResultCount = { rowCount?: number };

export interface PostgresConfig {
  connectionString: string;
  tableName?: string;
  embeddingDimensions?: number; // e.g., 1536
}

// PostgreSQL storage adapter using pgvector for embeddings and drizzle for query execution
export class PostgresStorageAdapter implements IStorageAdapter {
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;
  private tableName: string;
  private embeddingDimensions: number;

  constructor(config: PostgresConfig) {
    this.pool = new Pool({ connectionString: config.connectionString });
    this.db = drizzle(this.pool);
    this.tableName = config.tableName || "memories";
    this.embeddingDimensions = config.embeddingDimensions || 1536;
  }

  private async init(): Promise<void> {
    // Ensure pgvector extension and table
    await this.db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${sql.identifier(this.tableName)} (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding vector(${sql.raw(String(this.embeddingDimensions))}),
        metadata JSONB,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        relevance REAL,
        source TEXT
      )
    `);
  }

  async save(item: MemoryItem): Promise<void> {
    await this.init();
    const embeddingParam = item.embedding ? `[${item.embedding.join(",")}]` : null;
    const metadataParam = item.metadata ? JSON.stringify(item.metadata) : null;

    await this.db.execute(sql`
      INSERT INTO ${sql.identifier(this.tableName)}
        (id, type, content, embedding, metadata, createdAt, updatedAt, relevance, source)
      VALUES
        (${item.id}, ${item.type}, ${item.content}, ${embeddingParam === null ? sql`NULL` : sql`${sql.raw(embeddingParam)}::vector`}, ${metadataParam}, ${item.createdAt}, ${item.updatedAt ?? null}, ${item.relevance ?? null}, ${item.source ?? null})
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        createdAt = EXCLUDED.createdAt,
        updatedAt = EXCLUDED.updatedAt,
        relevance = EXCLUDED.relevance,
        source = EXCLUDED.source
    `);
  }

  async get(id: string): Promise<MemoryItem | null> {
    await this.init();
    const result = (await this.db.execute(sql`
      SELECT id, type, content, embedding::text AS embedding_text, metadata, createdAt, updatedAt, relevance, source
      FROM ${sql.identifier(this.tableName)}
      WHERE id = ${id}
      LIMIT 1
    `)) as unknown as ExecResultRows;

    // drizzle returns { rows } via node-postgres under the hood
    const row = result.rows?.[0];
    if (!row) return null;
    return this.deserializeRow(row);
  }

  async getAll(): Promise<MemoryItem[]> {
    await this.init();
    const result = (await this.db.execute(sql`
      SELECT id, type, content, embedding::text AS embedding_text, metadata, createdAt, updatedAt, relevance, source
      FROM ${sql.identifier(this.tableName)}
      ORDER BY createdAt DESC
    `)) as unknown as ExecResultRows;
    const rows = result.rows ?? [];
    return rows.map((r) => this.deserializeRow(r));
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const result = (await this.db.execute(sql`
      DELETE FROM ${sql.identifier(this.tableName)}
      WHERE id = ${id}
    `)) as ExecResultCount;
    return (result.rowCount ?? 0) > 0;
  }

  async clear(): Promise<void> {
    await this.init();
    await this.db.execute(sql`DELETE FROM ${sql.identifier(this.tableName)}`);
  }

  close(): void {
    void this.pool.end();
  }

  private deserializeRow(row: PgMemoryRow): MemoryItem {
    const embeddingText: string | null = row.embedding_text ?? null;
    const embedding = embeddingText
      ? embeddingText
          .replace(/^[[(]/, "")
          .replace(/[)\]]$/, "")
          .split(",")
          .map((n) => Number(n.trim()))
      : undefined;

    return {
      id: row.id,
      type: row.type as import("../../domain/models/MemoryItem").MemoryType,
      content: row.content,
      embedding,
      metadata: (row.metadata ?? undefined) as Record<string, any> | undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? undefined,
      relevance: row.relevance ?? undefined,
      source: row.source ?? undefined,
    };
  }
}