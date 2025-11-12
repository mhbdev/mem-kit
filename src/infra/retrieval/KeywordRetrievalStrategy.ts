import {MemoryItem} from "../../domain/models/MemoryItem";
import {IRetrievalStrategy} from "../../domain/ports/IRetrievalStrategy";

export class KeywordRetrievalStrategy implements IRetrievalStrategy {
    async retrieve(
        query: string,
        items: MemoryItem[],
        limit: number = 10
    ): Promise<MemoryItem[]> {
        const keywords = this.extractKeywords(query);

        // Score items based on keyword matches
        const scored = items.map((item) => {
            const itemText = `${item.content} ${JSON.stringify(item.metadata || {})}`.toLowerCase();
            const matches = keywords.filter((kw) => itemText.includes(kw)).length;
            return { item, score: matches };
        });

        // Sort by score and return top results
        return scored
            .filter((s) => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((s) => s.item);
    }

    private extractKeywords(text: string): string[] {
        return text
            .toLowerCase()
            .split(/\W+/)
            .filter((word) => word.length > 2);
    }
}