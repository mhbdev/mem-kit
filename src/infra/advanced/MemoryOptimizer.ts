// Reduce storage and improve retrieval speed

import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";
import {MemoryItem} from "../../domain/models/MemoryItem";

export class MemoryOptimizer {
    constructor(private llm: ILLMAdapter) {}

    async compressMemories(memories: MemoryItem[]): Promise<MemoryItem[]> {
        // Group similar memories
        const clusters = this.clusterMemories(memories);
        const compressed: MemoryItem[] = [];

        for (const cluster of clusters) {
            if (cluster.length === 1) {
                compressed.push(cluster[0]);
            } else {
                // Merge similar memories
                const merged = await this.mergeMemories(cluster);
                compressed.push(merged);
            }
        }

        return compressed;
    }

    private clusterMemories(memories: MemoryItem[]): MemoryItem[][] {
        // Simple clustering by similarity
        const clusters: MemoryItem[][] = [];
        const used = new Set<string>();

        for (const memory of memories) {
            if (used.has(memory.id)) continue;

            const cluster = [memory];
            used.add(memory.id);

            // Find similar memories
            for (const other of memories) {
                if (used.has(other.id)) continue;
                if (this.areSimilar(memory, other)) {
                    cluster.push(other);
                    used.add(other.id);
                }
            }

            clusters.push(cluster);
        }

        return clusters;
    }

    private areSimilar(mem1: MemoryItem, mem2: MemoryItem): boolean {
        // Check if embeddings are similar
        if (mem1.embedding && mem2.embedding) {
            const similarity = this.cosineSimilarity(mem1.embedding, mem2.embedding);
            return similarity > 0.9;
        }

        // Fallback to string similarity
        return this.jaccardSimilarity(mem1.content, mem2.content) > 0.7;
    }

    private async mergeMemories(memories: MemoryItem[]): Promise<MemoryItem> {
        const contents = memories.map(m => m.content).join('\n');

        const prompt = `Merge these related memories into one concise memory:

${contents}

Keep all important information but remove redundancy.`;

        const merged = await this.llm.generate(prompt);

        return {
            id: `merged_${Date.now()}`,
            type: 'summary',
            content: merged,
            createdAt: new Date().toISOString(),
            metadata: {
                mergedFrom: memories.map(m => m.id),
                originalCount: memories.length
            }
        };
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

    private jaccardSimilarity(str1: string, str2: string): number {
        const set1 = new Set(str1.toLowerCase().split(/\s+/));
        const set2 = new Set(str2.toLowerCase().split(/\s+/));

        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return intersection.size / union.size;
    }
}