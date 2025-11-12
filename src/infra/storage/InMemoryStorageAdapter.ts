import {MemoryItem} from "../../domain/models/MemoryItem";
import {IStorageAdapter} from "../../domain/ports/IStorageAdapter";

export class InMemoryStorageAdapter implements IStorageAdapter {
    private store: Map<string, MemoryItem> = new Map();

    async save(item: MemoryItem): Promise<void> {
        this.store.set(item.id, { ...item });
    }

    async get(id: string): Promise<MemoryItem | null> {
        return this.store.get(id) || null;
    }

    async getAll(): Promise<MemoryItem[]> {
        return Array.from(this.store.values());
    }

    async delete(id: string): Promise<boolean> {
        return this.store.delete(id);
    }

    async clear(): Promise<void> {
        this.store.clear();
    }
}