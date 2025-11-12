// Problem: Forget friends' preferences, birthdays, important moments
// Solution: Personal CRM that helps you be a better friend

import {AdvancedMemoryManager} from "../src/infra/advanced/AdvancedMemoryManager";
import {SQLiteStorageAdapter, OpenAIAdapter, OpenAIEmbeddingAdapter, MemoryItem} from "../src";

class RelationshipMemory {
    private memory: AdvancedMemoryManager;

    constructor() {
        this.memory = new AdvancedMemoryManager({
            storage: new SQLiteStorageAdapter('./relationships.db'),
            embedder: new OpenAIEmbeddingAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
            llm: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
            enableGraph: true
        });
    }

    async recordInteraction(person: string, notes: string, topics: string[]) {
        await this.memory.remember({
            type: 'event',
            content: `Talked with ${person}: ${notes}`,
            metadata: {
                person,
                topics,
                date: new Date().toISOString()
            }
        });
    }

    async recordPreference(person: string, preference: string) {
        await this.memory.remember({
            type: 'preference',
            content: `${person} ${preference}`,
            metadata: { person, importance: 0.9 }
        });
    }

    async prepareForMeeting(person: string) {
        // Get all memories about this person
        const memories = await this.memory.recallWithGraph(person, 2);

        // Find things to follow up on
        const followUps = memories.filter(m =>
            m.content.includes('worried') ||
            m.content.includes('excited') ||
            m.content.includes('working on')
        );

        return {
            recentTopics: this.extractRecentTopics(memories),
            followUps: followUps.map(m => m.content),
            preferences: memories.filter(m => m.type === 'preference'),
            lastInteraction: this.getLastInteraction(memories)
        };
    }

    async suggestGift(person: string, occasion: string) {
        const preferences = await this.memory.recall(`${person} likes`, 10);
        const recentTalks = await this.memory.recall(person, 5);

        return this.memory.generate(`
      Suggest a gift for ${person} for ${occasion}.
      
      Their preferences: ${preferences.map(p => p.content).join(', ')}
      Recent conversations: ${recentTalks.map(t => t.content).join(', ')}
      
      Suggest 3 thoughtful gift ideas with explanations.
    `);
    }

    async getProactiveReminders() {
        // Check for birthdays, follow-ups, etc.
        const allMemories = await this.memory.recall('', 1000);
        const now = new Date();

        const reminders = [];

        for (const memory of allMemories) {
            if (memory.metadata?.person) {
                const daysSince = this.daysSince(memory.createdAt);

                // Haven't talked in a while
                if (daysSince > 30) {
                    reminders.push({
                        type: 'reconnect',
                        person: memory.metadata.person,
                        message: `Haven't talked to ${memory.metadata.person} in ${daysSince} days`
                    });
                }
            }
        }

        return reminders;
    }

    private extractRecentTopics(memories: MemoryItem[]) {
        return memories
            .filter(m => m.metadata?.topics)
            .flatMap(m => m.metadata!.topics)
            .slice(0, 5);
    }

    private getLastInteraction(memories: MemoryItem[]) {
        const sorted = memories.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return sorted[0]?.createdAt || 'Never';
    }

    private daysSince(date: string): number {
        return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    }
}

// DEMO OUTPUT:
// "Meeting with Sarah tomorrow"
// - Last talked: 2 weeks ago
// - She was excited about her new job at Acme Corp
// - Prefers coffee over tea
// - Mentioned wanting to visit Japan
// - Follow up: How's the new job going?