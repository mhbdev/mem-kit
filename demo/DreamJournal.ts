// Problem: Dream journals are just random text files
// Solution: AI that finds patterns, symbols, and insights in your dreams

import {MemoryItem, OpenAIAdapter, SQLiteStorageAdapter} from "../src";
import {AdvancedMemoryManager} from "../src/infra/advanced/AdvancedMemoryManager";

class DreamJournal {
    private memory: AdvancedMemoryManager;

    constructor() {
        this.memory = new AdvancedMemoryManager({
            storage: new SQLiteStorageAdapter('./dreams.db'),
            enableHierarchy: true,
            enableGraph: true,
            enableMemoryReasoning: true,
            llm: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! })
        });
    }

    async recordDream(dream: string, emotions: string[]) {
        await this.memory.remember({
            type: 'event',
            content: dream,
            metadata: {
                date: new Date().toISOString(),
                emotions,
                type: 'dream'
            }
        });
    }

    async findPatterns() {
        const allDreams = await this.memory.recall('dream', 100);

        // Use memory reasoning to find patterns
        const patternText = await this.memory.generate(`List 5 recurring patterns/themes from these entries as comma-separated phrases:\n${allDreams.map(d => '- ' + d.content).join('\n')}`);
        const patterns = patternText.split(/[\,\n]/).map(s => s.trim()).filter(Boolean);

        return {
            recurringSymbols: await this.extractSymbols(allDreams),
            emotionalPatterns: await this.analyzeEmotions(allDreams),
            interpretations: patterns
        };
    }

    async askAboutDreams(question: string) {
        // Query dreams using memory reasoning
        const relevant = await this.memory.recallWithGraph(question, 2);

        return this.memory.reasoningEngine.infer(relevant, question);
    }

    private async extractSymbols(dreams: MemoryItem[]) {
        const symbols = new Map<string, number>();

        for (const dream of dreams) {
            const response = await this.memory.generate(`
        Extract symbolic elements from this dream:
        ${dream.content}
        
        Return as JSON array: ["symbol1", "symbol2", ...]
      `);

            const dreamSymbols = JSON.parse(response);
            dreamSymbols.forEach((symbol: string) => {
                symbols.set(symbol, (symbols.get(symbol) || 0) + 1);
            });
        }

        return Array.from(symbols.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    }

    private async analyzeEmotions(dreams: MemoryItem[]) {
        const emotions = dreams
            .flatMap(d => d.metadata?.emotions || [])
            .reduce((acc, emotion) => {
                acc[emotion] = (acc[emotion] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        return emotions;
    }
}

// DEMO OUTPUT:
// "Dream Patterns Over 90 Days"
// - Recurring symbols: Water (12x), Flying (8x), Lost (7x)
// - Emotional trend: Anxiety decreasing, joy increasing
// - AI Insight: "Your water dreams correlate with stressful work weeks.
//   Flying dreams appear after accomplishments."
