// Understand HOW memories relate to each other

import {IEmbeddingAdapter} from "../../domain/ports/IEmbeddingAdapter";
import {MemoryItem} from "../../domain/models/MemoryItem";

export interface MemoryRelation {
    from: string; // memory ID
    to: string;   // memory ID
    type: 'causes' | 'relates_to' | 'contradicts' | 'elaborates' | 'follows';
    strength: number; // 0-1
    metadata?: Record<string, any>;
}

export class MemoryGraph {
    private relations: MemoryRelation[] = [];

    constructor(private embedder: IEmbeddingAdapter) {}

    async addMemory(memory: MemoryItem, existing: MemoryItem[]): Promise<void> {
        // Automatically detect relationships with existing memories
        for (const existingMem of existing) {
            const relation = await this.detectRelation(memory, existingMem);
            if (relation) {
                this.relations.push(relation);
            }
        }
    }

    private async detectRelation(
        mem1: MemoryItem,
        mem2: MemoryItem
    ): Promise<MemoryRelation | null> {
        // Use embeddings to detect semantic similarity
        if (!mem1.embedding || !mem2.embedding) return null;

        const similarity = this.cosineSimilarity(mem1.embedding, mem2.embedding);

        if (similarity > 0.85) {
            // High similarity - likely elaboration or related
            return {
                from: mem1.id,
                to: mem2.id,
                type: 'relates_to',
                strength: similarity
            };
        }

        // Could use LLM to detect causal relationships
        // "User said X" → "User did Y" might be causal

        return null;
    }

    getRelatedMemories(memoryId: string, maxDepth: number = 2): string[] {
        // Graph traversal to find all related memories
        const visited = new Set<string>();
        const queue: Array<{id: string, depth: number}> = [{id: memoryId, depth: 0}];
        const related: string[] = [];

        while (queue.length > 0) {
            const {id, depth} = queue.shift()!;
            if (visited.has(id) || depth > maxDepth) continue;

            visited.add(id);
            if (id !== memoryId) related.push(id);

            // Find connected memories
            const connections = this.relations.filter(r => r.from === id || r.to === id);
            for (const conn of connections) {
                const nextId = conn.from === id ? conn.to : conn.from;
                queue.push({id: nextId, depth: depth + 1});
            }
        }

        return related;
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}