// Not all memories are equal - prioritize important ones

import {MemoryItem} from "../../domain/models/MemoryItem";
import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";

export interface ImportanceScorer {
    score(memory: MemoryItem): Promise<number>;
}

export class MLImportanceScorer implements ImportanceScorer {
    constructor(private llm: ILLMAdapter) {}

    async score(memory: MemoryItem): Promise<number> {
        const prompt = `Rate the importance of this memory on a scale of 0-1:

Memory: ${memory.content}
Type: ${memory.type}

Consider:
- Uniqueness (unique events > routine events)
- Emotional significance
- Long-term relevance
- Actionability

Return ONLY a number between 0 and 1.`;

        const response = await this.llm.generate(prompt);
        const score = parseFloat(response.trim());

        return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    }
}

export class HeuristicImportanceScorer implements ImportanceScorer {
    async score(memory: MemoryItem): Promise<number> {
        let score = 0.5; // baseline

        // Type-based scoring
        const typeScores = {
            preference: 0.8,  // Preferences are important
            fact: 0.6,
            event: 0.5,
            summary: 0.9,     // Summaries are very important
            todo: 0.7
        };
        score = typeScores[memory.type] || 0.5;

        // Recency boost (exponential decay)
        const age = Date.now() - new Date(memory.createdAt).getTime();
        const days = age / (1000 * 60 * 60 * 24);
        score *= Math.exp(-days / 30); // 30-day half-life

        // Content length (longer = more detailed = more important)
        if (memory.content.length > 200) score += 0.1;

        // Has metadata (more structured = more important)
        if (memory.metadata && Object.keys(memory.metadata).length > 0) {
            score += 0.1;
        }

        return Math.min(1, score);
    }
}
