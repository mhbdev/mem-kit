// Handle conflicting memories intelligently

import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";
import {IEmbeddingAdapter} from "../../domain/ports/IEmbeddingAdapter";
import {MemoryItem} from "../../domain/models/MemoryItem";

export class ContradictionDetector {
    constructor(
        private llm: ILLMAdapter,
        private embedder: IEmbeddingAdapter
    ) {}

    async detectContradictions(
        newMemory: MemoryItem,
        existing: MemoryItem[]
    ): Promise<MemoryItem[]> {
        // Ensure embeddings exist for semantic checks
        if (!newMemory.embedding && this.embedder) {
            newMemory.embedding = await this.embedder.embed(newMemory.content);
        }
        if (!newMemory.embedding) return [];

        const contradictions: MemoryItem[] = [];

        for (const mem of existing) {
            if (!mem.embedding && this.embedder) {
                mem.embedding = await this.embedder.embed(mem.content);
            }
            if (!mem.embedding) continue;

            // Check semantic similarity
            const similarity = this.cosineSimilarity(
                newMemory.embedding,
                mem.embedding
            );

            // Similar topic but might contradict
            if (similarity > 0.7) {
                const isContradiction = await this.checkContradiction(newMemory, mem);
                if (isContradiction) {
                    contradictions.push(mem);
                }
            }
        }

        return contradictions;
    }

    private async checkContradiction(
        mem1: MemoryItem,
        mem2: MemoryItem
    ): Promise<boolean> {
        const prompt = `Do these two statements contradict each other?

Statement 1: ${mem1.content}
Statement 2: ${mem2.content}

Answer with YES or NO, then briefly explain.`;

        const response = await this.llm.generate(prompt);
        return response.toLowerCase().startsWith('yes');
    }

    async resolveContradiction(
        newMemory: MemoryItem,
        oldMemory: MemoryItem
    ): Promise<'keep_new' | 'keep_old' | 'merge'> {
        const prompt = `Two contradicting memories:

OLD: ${oldMemory.content} (from ${oldMemory.createdAt})
NEW: ${newMemory.content} (from ${newMemory.createdAt})

What should we do?
- KEEP_NEW: The new information supersedes the old
- KEEP_OLD: The old information is still correct
- MERGE: Both contain partial truth

Answer with one word: KEEP_NEW, KEEP_OLD, or MERGE`;

        const response = await this.llm.generate(prompt);

        if (response.includes('KEEP_NEW')) return 'keep_new';
        if (response.includes('KEEP_OLD')) return 'keep_old';
        return 'merge';
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
