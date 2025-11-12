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
        const analytics = await this.memory.getAnalytics();
        const emotionalTimeline = await this.memory.getEmotionalTimeline();

        // Generate AI insights
        const insights = await this.memory.llm.generate(`
      Based on these life events and emotional patterns:
      
      Events: ${analytics.totalMemories}
      Emotional trend: ${emotionalTimeline[emotionalTimeline.length - 1]?.avgValence}
      
      Generate 3 meaningful life insights in 2-3 sentences each.
    `);

        return { analytics, emotionalTimeline, insights };
    }

    async generateYearInReview(year: number) {
        const yearMemories = await this.memory.recallByTimeRange(
            `${year}-01-01`,
            `${year}-12-31`
        );

        return this.memory.summarize({
            memories: yearMemories,
            style: 'narrative' // Tell it as a story
        });
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
