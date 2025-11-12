import {MemoryItem} from "../../domain/models/MemoryItem";
import {IEmbeddingAdapter} from "../../domain/ports/IEmbeddingAdapter";
import {IRetrievalStrategy} from "../../domain/ports/IRetrievalStrategy";

export class EmbeddingRetrievalStrategy implements IRetrievalStrategy {
    constructor(private embedder: IEmbeddingAdapter) {}

    async retrieve(
        query: string,
        items: MemoryItem[],
        limit: number = 10
    ): Promise<MemoryItem[]> {
        // Generate query embedding
        const queryEmbedding = await this.embedder.embed(query);
        const keywords = this.extractKeywords(query);

        // Filter items with embeddings and calculate similarities
        const scored = items
            .filter((item) => item.embedding)
            .map((item) => {
                const base = this.cosineSimilarity(queryEmbedding, item.embedding!);
                const itemText = `${item.content} ${JSON.stringify(item.metadata || {})}`.toLowerCase();
                const matches = keywords.filter((kw) => itemText.includes(kw)).length;
                const boost = matches > 0 ? 0.5 * matches : 0;
                return { item, score: base + boost };
            });

        // Sort by similarity and return top results
        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((s) => s.item);
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private extractKeywords(text: string): string[] {
        return text
            .toLowerCase()
            .split(/\W+/)
            .filter((word) => word.length > 2);
    }
}
