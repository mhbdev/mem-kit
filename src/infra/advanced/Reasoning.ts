// Draw conclusions from multiple memories

import {MemoryItem} from "../../domain/models/MemoryItem";
import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";

export class MemoryReasoning {
    constructor(private llm: ILLMAdapter) {}

    async infer(
        memories: MemoryItem[],
        question: string
    ): Promise<{answer: string, confidence: number, sources: string[]}> {
        const context = memories
            .map(m => `[${m.id}] ${m.content}`)
            .join('\n');

        const prompt = `Based on these memories, answer the question:

MEMORIES:
${context}

QUESTION: ${question}

Provide:
1. Your answer
2. Confidence (0-1)
3. Memory IDs that support your answer

Format as JSON: {"answer": "...", "confidence": 0.8, "sources": ["id1", "id2"]}`;

        const response = await this.llm.generate(prompt);
        return JSON.parse(response);
    }

    async findGaps(memories: MemoryItem[]): Promise<string[]> {
        const context = memories.map(m => m.content).join('\n');

        const prompt = `Given these memories, what important information is missing?

${context}

List 3-5 key questions that would fill knowledge gaps.
Return as JSON array: ["question1", "question2", ...]`;

        const response = await this.llm.generate(prompt);
        return JSON.parse(response);
    }

    async detectPatterns(memories: MemoryItem[]): Promise<string[]> {
        const context = memories.map(m => m.content).join('\n');

        const prompt = `Analyze these memories and identify patterns, habits, or trends:

${context}

Return insights as JSON array: ["pattern1", "pattern2", ...]`;

        const response = await this.llm.generate(prompt);
        return JSON.parse(response);
    }
}