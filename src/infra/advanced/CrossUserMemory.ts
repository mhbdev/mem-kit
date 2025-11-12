// Share and merge memory contexts between users/agents

import {MemoryItem} from "../../domain/models/MemoryItem";
import {IStorageAdapter} from "../../domain/ports/IStorageAdapter";

export class MemoryTransfer {
    async exportMemories(
        memories: MemoryItem[],
        options: {
            includeEmbeddings?: boolean;
            anonymize?: boolean;
            compress?: boolean;
        }
    ): Promise<string> {
        let exported = memories.map(m => ({
            ...m,
            embedding: options.includeEmbeddings ? m.embedding : undefined,
            metadata: options.anonymize ? this.anonymizeMetadata(m.metadata) : m.metadata
        }));

        const json = JSON.stringify(exported, null, options.compress ? 0 : 2);

        if (options.compress) {
            // Could use compression here
            return json;
        }

        return json;
    }

    async importMemories(
        data: string,
        mergeStrategy: 'append' | 'merge' | 'replace',
        storage: IStorageAdapter
    ): Promise<number> {
        const imported: MemoryItem[] = JSON.parse(data);

        if (mergeStrategy === 'replace') {
            await storage.clear();
        }

        let count = 0;
        for (const memory of imported) {
            if (mergeStrategy === 'merge') {
                // Check for duplicates
                const existing = await storage.get(memory.id);
                if (existing) continue;
            }

            await storage.save(memory);
            count++;
        }

        return count;
    }

    private anonymizeMetadata(metadata?: Record<string, any>): Record<string, any> {
        if (!metadata) return {};

        const anonymized = {...metadata};
        const keysToRemove = ['userId', 'email', 'name', 'phone', 'address'];

        for (const key of keysToRemove) {
            delete anonymized[key];
        }

        return anonymized;
    }
}
