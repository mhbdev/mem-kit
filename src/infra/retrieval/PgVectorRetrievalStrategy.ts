import { IRetrievalStrategy } from "../../domain/ports/IRetrievalStrategy";
import { MemoryItem } from "../../domain/models/MemoryItem";
import { IEmbeddingAdapter } from "../../domain/ports/IEmbeddingAdapter";
import { Pool, QueryResult } from "pg";

interface PgVectorRow {
  id: string;
  type: string;
  content: string;
  embedding_text?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt?: string | null;
  relevance?: number | null;
  source?: string | null;
}

/**
 * Retrieval strategy that performs server-side similarity search using pgvector.
 * Ignores the provided items and queries Postgres directly for efficiency.
 */
export class PgVectorRetrievalStrategy implements IRetrievalStrategy {
  private pool: Pool;
  private tableName: string;
  private embedder: IEmbeddingAdapter;

  constructor(options: { pool: Pool; tableName?: string; embedder: IEmbeddingAdapter }) {
    this.pool = options.pool;
    this.tableName = options.tableName ?? "memories";
    this.embedder = options.embedder;
  }

  async retrieve(query: string, _items: MemoryItem[], limit: number = 10): Promise<MemoryItem[]> {
    // Generate query embedding and perform vector similarity ordering in SQL
    const queryEmbedding = await this.embedder.embed(query);
    const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

    const sql = `
      SELECT id, type, content, embedding::text AS embedding_text, metadata, createdAt, updatedAt, relevance, source
      FROM ${this.tableName}
      WHERE embedding IS NOT NULL
      ORDER BY embedding <-> $1::vector
      LIMIT $2
    `;

    const res: QueryResult<PgVectorRow> = await this.pool.query(sql, [embeddingLiteral, limit]);
    return (res.rows ?? []).map((row) => this.deserializeRow(row));
  }

  private deserializeRow(row: PgVectorRow): MemoryItem {
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
      type: row.type as MemoryItem["type"],
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