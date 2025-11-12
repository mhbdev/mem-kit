// Problem: Want to practice debate but AI forgets your previous arguments
// Solution: AI opponent that references your past positions and evolves

import {AdvancedMemoryManager} from "../src/infra/advanced/AdvancedMemoryManager";
import {ContradictionDetector} from "../src/infra/advanced/ContradictionDetector";
import {InMemoryStorageAdapter} from "../src";

class DebatePartner {
    private memory: AdvancedMemoryManager;
    private contradictionDetector: ContradictionDetector;

    constructor(topic: string) {
        this.memory = new AdvancedMemoryManager({
            storage: new InMemoryStorageAdapter(),
            enableContradictionDetection: true,
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
        const contradictions = await this.contradictionDetector.detect(argument);

        if (contradictions.length > 0) {
            return {
                response: `Wait, you previously argued: "${contradictions[0].content}". How do you reconcile this?`,
                type: 'challenge'
            };
        }

        // Find related past arguments to counter
        const relatedArguments = await this.memory.recallWithGraph(argument, 2);

        // Generate counter-argument using your debate history
        const counter = await this.memory.llm.generate(`
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

        return this.memory.llm.generate(`
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
