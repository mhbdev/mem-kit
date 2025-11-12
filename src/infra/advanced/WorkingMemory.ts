import {MemoryItem} from "../../domain/models/MemoryItem";
import {IStorageAdapter} from "../../domain/ports/IStorageAdapter";

export class WorkingMemory {
    private working: MemoryItem[] = [];
    private maxSize: number;

    constructor(
        maxSize: number = 10,
        private storage: IStorageAdapter
    ) {
        this.maxSize = maxSize;
    }

    async activate(memory: MemoryItem): Promise<void> {
        // Move memory to working memory
        this.working.unshift(memory);

        // Evict if overflow (LRU strategy)
        if (this.working.length > this.maxSize) {
            const evicted = this.working.pop()!;
            await this.storage.save({
                ...evicted,
                metadata: {
                    ...evicted.metadata,
                    lastAccessed: new Date().toISOString()
                }
            });
        }
    }

    async recall(query: string): Promise<MemoryItem[]> {
        // Search working memory first (fastest)
        const workingResults = this.working.filter(m =>
            m.content.toLowerCase().includes(query.toLowerCase())
        );

        if (workingResults.length > 0) {
            return workingResults;
        }

        // Fall back to cold storage
        const allMemories = await this.storage.getAll();
        return allMemories.filter(m =>
            m.content.toLowerCase().includes(query.toLowerCase())
        );
    }

    getContext(): MemoryItem[] {
        // Return current working memory for LLM context
        return [...this.working];
    }
}
