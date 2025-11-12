// Problem: Coding tutorials don't adapt to what you already know
// Solution: AI tutor that remembers your skill level and progress

import {MemoryItem, SQLiteStorageAdapter, OpenAIAdapter, OpenAIEmbeddingAdapter} from "../src";
import {AdvancedMemoryManager} from "../src/infra/advanced/AdvancedMemoryManager";

class CodeMentor {
    private memory: AdvancedMemoryManager;

    constructor(studentId: string) {
        this.memory = new AdvancedMemoryManager({
            storage: new SQLiteStorageAdapter(`./student_${studentId}.db`),
            embedder: new OpenAIEmbeddingAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
            llm: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
            enableGraph: true
        });
    }

    async recordLearning(topic: string, understood: boolean, notes: string) {
        await this.memory.remember({
            type: understood ? 'fact' : 'todo',
            content: `${topic}: ${notes}`,
            metadata: {
                topic,
                understood,
                attempts: 1,
                timestamp: new Date().toISOString()
            }
        });
    }

    async getNextLesson() {
        // Find what they know and what they're struggling with
        const understood = await this.memory.recall('understood: true', 100);
        const struggling = await this.memory.recall('understood: false', 100);
        const gaps = struggling.map(m => m.metadata?.topic || m.content);

        return this.memory.generate(`
      Student knows: ${understood.map(m => m.content).join(', ')}
      Student struggles with: ${struggling.map(m => m.content).join(', ')}
      Knowledge gaps: ${gaps.join(', ')}
      
      Design the perfect next lesson that:
      1. Builds on what they know
      2. Addresses a knowledge gap
      3. Avoids topics they're struggling with
      4. Has a clear, achievable goal
    `);
    }

    async explainConcept(concept: string) {
        // Tailor explanation to their knowledge level
        const relatedKnowledge = await this.memory.recallWithGraph(concept, 2);

        return this.memory.generate(`
      Explain ${concept} to a student who knows:
      ${relatedKnowledge.map(m => m.content).join('\n')}
      
      Use analogies from their existing knowledge.
      Start simple, then go deeper.
    `);
    }

    async getLearningProgress() {
        const all = await this.memory.recall('', 1000);
        const understood = await this.memory.recall('understood: true', 1000);

        return {
            totalConcepts: all.length,
            mastered: understood.length,
            masteryRate: all.length ? understood.length / all.length : 0,
            recentProgress: this.getRecentProgress(understood)
        };
    }

    private getRecentProgress(understood: MemoryItem[]) {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return understood.filter(m =>
            new Date(m.createdAt).getTime() > oneWeekAgo
        ).length;
    }
}

// DEMO OUTPUT:
// "Your Learning Path"
// Day 1: Variables, functions (mastered)
// Day 3: Loops - struggled with nested loops
// Day 5: Arrays (mastered)
//
// AI Suggestion: "You're ready for objects! They're like arrays but
// with named properties. Since you mastered functions, think of
// methods as functions inside objects."