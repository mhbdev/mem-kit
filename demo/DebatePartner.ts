// Problem: Want to practice debate but AI forgets your previous arguments
// Solution: AI opponent that references your past positions and evolves

import {AdvancedMemoryManager} from "../src/infra/advanced/AdvancedMemoryManager";
import {InMemoryStorageAdapter, OpenAIAdapter, OpenAIEmbeddingAdapter} from "../src";

class DebatePartner {
    private memory: AdvancedMemoryManager;
    

    constructor(topic: string) {
        this.memory = new AdvancedMemoryManager({
            storage: new InMemoryStorageAdapter(),
            embedder: new OpenAIEmbeddingAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
            llm: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
            enableMemoryReasoning: true,
            enableGraph: true
        });

        this.memory.remember({
            type: 'fact',
            content: `Debate topic: ${topic}`
        });
    }

    async makeArgument(argument: string) {
        // Store your argument
        await this.memory.remember({
            type: 'preference',
            content: `User argues: ${argument}`
        });

        // Check for contradictions with your past arguments
        // Check for potential inconsistencies via related past arguments
        const past = await this.memory.recall('User argues:', 50);
        const possibleContradiction = past.find(p => p.content.includes('not') !== argument.includes('not'));
        if (possibleContradiction) {
            return {
                response: `Earlier you said: "${possibleContradiction.content}". How does that fit with your current claim?`,
                type: 'challenge'
            };
        }

        // Find related past arguments to counter
        const relatedArguments = await this.memory.recallWithGraph(argument, 2);

        // Generate counter-argument using your debate history
        const counter = await this.memory.generate(`
      User argues: ${argument}
      
      Their previous positions: ${relatedArguments.map(m => m.content).join('; ')}
      
      Generate a thoughtful counter-argument that:
      1. References their past positions
      2. Challenges internal consistency
      3. Proposes alternative viewpoint
    `);

        return { response: counter, type: 'counter' };
    }

    async getDebateSummary() {
        const allArguments = await this.memory.recall('argues', 100);

        return this.memory.generate(`
      Analyze this debate history and identify:
      1. User's core beliefs
      2. Weak points in their argumentation
      3. Areas where they contradicted themselves
      4. How their position evolved
      
      ${allArguments.map(m => m.content).join('\n')}
    `);
    }
}

// DEMO OUTPUT:
// User: "Free markets are always efficient"
// AI: "But you argued yesterday that 'healthcare needs regulation'.
//      How do you reconcile these positions?"
