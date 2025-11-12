// Note: Requires 'better-sqlite3' package
import {IStorageAdapter} from "../../domain/ports/IStorageAdapter";
import {MemoryItem} from "../../domain/models/MemoryItem";

export class SQLiteStorageAdapter implements IStorageAdapter {
    private db: any;

    constructor(dbPath: string = ":memory:") {
        // In production, import: const Database = require('better-sqlite3');
        // this.db = new Database(dbPath);
        this.db = null; // Placeholder for demo
        this.initDatabase();
    }

    private initDatabase(): void {
        if (!this.db) return;

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
        if (!this.db) throw new Error("SQLite not initialized");

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
        if (!this.db) throw new Error("SQLite not initialized");

        const stmt = this.db.prepare("SELECT * FROM memories WHERE id = ?");
        const row = stmt.get(id);

        return row ? this.deserializeRow(row) : null;
    }

    async getAll(): Promise<MemoryItem[]> {
        if (!this.db) throw new Error("SQLite not initialized");

        const stmt = this.db.prepare("SELECT * FROM memories ORDER BY createdAt DESC");
        const rows = stmt.all();

        return rows.map(this.deserializeRow);
    }

    async delete(id: string): Promise<boolean> {
        if (!this.db) throw new Error("SQLite not initialized");

        const stmt = this.db.prepare("DELETE FROM memories WHERE id = ?");
        const result = stmt.run(id);

        return result.changes > 0;
    }

    async clear(): Promise<void> {
        if (!this.db) throw new Error("SQLite not initialized");
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
        if (this.db) {
            this.db.close();
        }
    }
}