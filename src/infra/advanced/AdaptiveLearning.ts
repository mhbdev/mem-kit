// Learn from usage patterns to optimize automatically

import {AdvancedMemoryManager} from "./AdvancedMemoryManager";

export class AdaptiveLearningSystem {
    private usageStats = {
        queriesPerCategory: new Map<string, number>(),
        successfulRetrievals: new Map<string, number>(),
        averageRetrievalTime: new Map<string, number[]>()
    };

    recordQuery(category: string, retrievalTime: number, success: boolean): void {
        // Track query patterns
        const current = this.usageStats.queriesPerCategory.get(category) || 0;
        this.usageStats.queriesPerCategory.set(category, current + 1);

        if (success) {
            const successCount = this.usageStats.successfulRetrievals.get(category) || 0;
            this.usageStats.successfulRetrievals.set(category, successCount + 1);
        }

        const times = this.usageStats.averageRetrievalTime.get(category) || [];
        times.push(retrievalTime);
        this.usageStats.averageRetrievalTime.set(category, times);
    }

    getOptimizationRecommendations(): Array<{
        category: string;
        recommendation: string;
        impact: 'high' | 'medium' | 'low';
    }> {
        const recommendations = [];

        // Find slow categories
        for (const [category, times] of this.usageStats.averageRetrievalTime) {
            const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;

            if (avgTime > 1000) {
                recommendations.push({
                    category,
                    recommendation: `Add pre-computed embeddings for "${category}" memories`,
                    impact: 'high' as const
                });
            }
        }

        // Find low-success categories
        for (const [category, queries] of this.usageStats.queriesPerCategory) {
            const successes = this.usageStats.successfulRetrievals.get(category) || 0;
            const successRate = successes / queries;

            if (successRate < 0.5) {
                recommendations.push({
                    category,
                    recommendation: `Improve retrieval strategy for "${category}" (low success rate)`,
                    impact: 'medium' as const
                });
            }
        }

        return recommendations;
    }

    async autoOptimize(memoryManager: AdvancedMemoryManager): Promise<void> {
        const recommendations = this.getOptimizationRecommendations();

        for (const rec of recommendations) {
            if (rec.impact === 'high') {
                // Apply optimization automatically
                // E.g., pre-compute embeddings, adjust retrieval parameters
            }
        }
    }
}