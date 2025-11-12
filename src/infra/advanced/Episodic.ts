import {MemoryItem} from "../../domain/models/MemoryItem";
import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";
import {IStorageAdapter} from "../../domain/ports/IStorageAdapter";

export type EpisodicMemory = {
    type: 'episodic';
    when: string;
    where?: string;
    who?: string[];
    what: string;
    context: Record<string, any>;
};

export type SemanticMemory = {
    type: 'semantic';
    fact: string;
    confidence: number;
    sources: string[]; // IDs of episodic memories that support this
    lastUpdated: string;
};

export class DualMemorySystem {
    private episodic: MemoryItem[] = [];
    private semantic: Map<string, SemanticMemory> = new Map();

    constructor(
        private llm: ILLMAdapter,
        private storage: IStorageAdapter
    ) {}

    async addEpisode(episode: EpisodicMemory): Promise<void> {
        // Store the episode
        const memory: MemoryItem = {
            id: `episode_${Date.now()}`,
            type: 'event',
            content: episode.what,
            createdAt: episode.when,
            metadata: episode.context
        };

        await this.storage.save(memory);
        this.episodic.push(memory);

        // Extract semantic knowledge from the episode
        await this.extractSemanticKnowledge(memory);
    }

    private async extractSemanticKnowledge(episode: MemoryItem): Promise<void> {
        const prompt = `From this event, extract general knowledge or patterns:

Event: ${episode.content}

What general facts, preferences, or patterns can we learn?
Format as a JSON array of facts with confidence (0-1):
[{"fact": "...", "confidence": 0.9}, ...]`;

        const response = await this.llm.generate(prompt);
        const facts = JSON.parse(response);

        for (const {fact, confidence} of facts) {
            this.updateSemanticMemory(fact, confidence, episode.id);
        }
    }

    private updateSemanticMemory(fact: string, confidence: number, sourceId: string): void {
        const existing = this.semantic.get(fact);

        if (existing) {
            // Update confidence and add source
            existing.confidence = Math.min(
                1,
                existing.confidence + confidence * 0.1
            );
            existing.sources.push(sourceId);
            existing.lastUpdated = new Date().toISOString();
        } else {
            // New semantic memory
            this.semantic.set(fact, {
                type: 'semantic',
                fact,
                confidence,
                sources: [sourceId],
                lastUpdated: new Date().toISOString()
            });
        }
    }

    async recall(query: string, includeEpisodic: boolean = true): Promise<{
        semantic: SemanticMemory[];
        episodic: MemoryItem[];
    }> {
        // Search both memory systems
        const semantic = Array.from(this.semantic.values())
            .filter(m => m.fact.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => b.confidence - a.confidence);

        const episodic = includeEpisodic
            ? this.episodic.filter(m =>
                m.content.toLowerCase().includes(query.toLowerCase())
            )
            : [];

        return { semantic, episodic };
    }
}