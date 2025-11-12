import {MemoryItem} from "../../domain/models/MemoryItem";
import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";

export interface ConsolidationStrategy {
    shouldConsolidate(memories: MemoryItem[]): boolean;
    consolidate(memories: MemoryItem[]): Promise<MemoryItem>;
}

export class TemporalConsolidation implements ConsolidationStrategy {
    constructor(
        private llm: ILLMAdapter,
        private options: {
            minMemories: number;
            timeWindow: number; // hours
            similarityThreshold: number;
        }
    ) {}

    shouldConsolidate(memories: MemoryItem[]): boolean {
        // Consolidate if we have many similar memories in a time window
        const recent = memories.filter(m => {
            const age = Date.now() - new Date(m.createdAt).getTime();
            return age < this.options.timeWindow * 3600000;
        });

        return recent.length >= this.options.minMemories;
    }

    async consolidate(memories: MemoryItem[]): Promise<MemoryItem> {
        const memoryTexts = memories.map(m => m.content).join('\n');

        const prompt = `Consolidate these related memories into a single, comprehensive summary:

${memoryTexts}

Extract:
1. Key facts and patterns
2. Preferences and tendencies  
3. Important relationships
4. Notable events

Format as a concise but complete summary.`;

        const consolidated = await this.llm.generate(prompt);

        return {
            id: `consolidated_${Date.now()}`,
            type: 'summary',
            content: consolidated,
            createdAt: new Date().toISOString(),
            metadata: {
                consolidatedFrom: memories.map(m => m.id),
                consolidatedCount: memories.length
            }
        };
    }
}