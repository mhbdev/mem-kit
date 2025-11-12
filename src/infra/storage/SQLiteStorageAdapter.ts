// Production SQLite storage using better-sqlite3
import {IStorageAdapter} from "../../domain/ports/IStorageAdapter";
import {MemoryItem} from "../../domain/models/MemoryItem";
import Database from "better-sqlite3";

export class SQLiteStorageAdapter implements IStorageAdapter {
    private db: Database.Database;

    constructor(dbPath: string = ":memory:") {
        this.db = new Database(dbPath);
        this.initDatabase();
    }

    private initDatabase(): void {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        metadata TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        relevance REAL,
        source TEXT
      )
    `);
    }

    async save(item: MemoryItem): Promise<void> {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories 
      (id, type, content, embedding, metadata, createdAt, updatedAt, relevance, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            item.id,
            item.type,
            item.content,
            item.embedding ? JSON.stringify(item.embedding) : null,
            item.metadata ? JSON.stringify(item.metadata) : null,
            item.createdAt,
            item.updatedAt || null,
            item.relevance || null,
            item.source || null
        );
    }

    async get(id: string): Promise<MemoryItem | null> {
        const stmt = this.db.prepare("SELECT * FROM memories WHERE id = ?");
        const row = stmt.get(id);
        return row ? this.deserializeRow(row) : null;
    }

    async getAll(): Promise<MemoryItem[]> {
        const stmt = this.db.prepare("SELECT * FROM memories ORDER BY createdAt DESC");
        const rows = stmt.all();
        return rows.map((row: any) => this.deserializeRow(row));
    }

    async delete(id: string): Promise<boolean> {
        const stmt = this.db.prepare("DELETE FROM memories WHERE id = ?");
        const result = stmt.run(id);
        return (result as any).changes > 0;
    }

    async clear(): Promise<void> {
        this.db.exec("DELETE FROM memories");
    }

    private deserializeRow(row: any): MemoryItem {
        return {
            id: row.id,
            type: row.type,
            content: row.content,
            embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt || undefined,
            relevance: row.relevance || undefined,
            source: row.source || undefined,
        };
    }

    close(): void {
        this.db.close();
    }
}