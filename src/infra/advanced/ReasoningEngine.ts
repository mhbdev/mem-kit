import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";
import {MemoryItem} from "../../domain/models/MemoryItem";

export class ReasoningEngine {
    private llm: ILLMAdapter;

    constructor(llm: ILLMAdapter) {
        this.llm = llm;
    }

    async infer(memories: MemoryItem[], question: string): Promise<string> {
        const context = memories.map(m => `- [${m.type}] ${m.content}`).join("\n");
        const prompt = `Use the following memories to answer the question.\n\nMemories:\n${context}\n\nQuestion: ${question}\n\nAnswer:`;
        return this.llm.generate(prompt);
    }

    async findGaps(understood: MemoryItem[]): Promise<string[]> {
        const topics = understood
            .map(m => m.metadata?.topic)
            .filter(Boolean)
            .map(String);
        const prompt = `Given the list of topics the user understands: ${topics.join(", ")}.\nList 5 short knowledge gaps (topics they likely need next). Return as a comma-separated list.`;
        const out = await this.llm.generate(prompt);
        return out.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    }
}