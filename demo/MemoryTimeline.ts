// Problem: People forget important moments and patterns in their lives
// Solution: AI that creates an interactive timeline from your memories

import {AdvancedMemoryManager} from "../src/infra/advanced/AdvancedMemoryManager";
import {OpenAIAdapter, OpenAIEmbeddingAdapter, SQLiteStorageAdapter} from "../src";

class MemoryTimeline {
    private memory: AdvancedMemoryManager;

    constructor() {
        this.memory = new AdvancedMemoryManager({
            storage: new SQLiteStorageAdapter('./timeline.db'),
            embedder: new OpenAIEmbeddingAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
            llm: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
            enableEmotionalTracking: true,
            enableHierarchy: true,
            enableAnalytics: true
        });
    }

    async addMoment(text: string, photos?: string[]) {
        // Store the moment with emotional context
        await this.memory.remember({
            type: 'event',
            content: text,
            metadata: { photos, timestamp: new Date().toISOString() }
        });
    }

    async getLifeInsights() {
        const recent = await this.memory.recall('', 100);
        const insights = await this.memory.generate(`
      Based on these recent life events (count=${recent.length}):
      ${recent.slice(0, 10).map(m => `- ${m.content}`).join('\n')}
      Generate 3 meaningful life insights in 2-3 sentences each.
    `);

        return { recentCount: recent.length, insights };
    }

    async generateYearInReview(year: number) {
        const all = await this.memory.recall('', 1000);
        const yearMemories = all.filter(m => {
            const d = new Date(m.createdAt);
            return d.getFullYear() === year;
        });
        const memoriesText = yearMemories.map(m => `- ${m.content} (${m.createdAt})`).join('\n');
        return this.memory.generate(`Create a "Year in Review" narrative for ${year} based on:\n${memoriesText}`);
    }
}

// DEMO OUTPUT:
// "Your Life Timeline - 2024"
// - January: Started learning TypeScript, felt excited (8/10)
// - March: Job interview went well, very nervous (6/10)
// - June: First open source contribution, proud (9/10)
//
// AI Insight: "You show a pattern of growth through learning. Your
// emotional peaks correlate with technical achievements."
