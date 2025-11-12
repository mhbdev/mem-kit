// Generate insights about memory usage and patterns

import {MemoryItem, MemoryType} from "../../domain/models/MemoryItem";

export interface MemoryAnalytics {
    totalMemories: number;
    memoryByType: Record<MemoryType, number>;
    averageAge: number;
    mostRecentActivity: string;
    storageSize: number;
    topCategories: Array<{category: string, count: number}>;
    memoryGrowthRate: number; // memories per day
    retrievalPatterns: Record<string, number>;
}

export class MemoryAnalyticsEngine {
    async generateAnalytics(memories: MemoryItem[]): Promise<MemoryAnalytics> {
        const now = Date.now();

        const memoryByType = memories.reduce((acc, m) => {
            acc[m.type] = (acc[m.type] || 0) + 1;
            return acc;
        }, {} as Record<MemoryType, number>);

        const ages = memories.map(m =>
            now - new Date(m.createdAt).getTime()
        );
        const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;

        const mostRecent = memories.reduce((latest, m) => {
            return new Date(m.createdAt) > new Date(latest) ? m.createdAt : latest;
        }, memories[0]?.createdAt || new Date().toISOString());

        // Estimate storage size
        const storageSize = memories.reduce((sum, m) => {
            return sum + JSON.stringify(m).length;
        }, 0);

        // Calculate growth rate
        const oldest = memories.reduce((old, m) => {
            return new Date(m.createdAt) < new Date(old) ? m.createdAt : old;
        }, memories[0]?.createdAt || new Date().toISOString());

        const daysSinceStart = (now - new Date(oldest).getTime()) / (1000 * 60 * 60 * 24);
        const memoryGrowthRate = memories.length / Math.max(1, daysSinceStart);

        return {
            totalMemories: memories.length,
            memoryByType,
            averageAge: averageAge / (1000 * 60 * 60 * 24), // in days
            mostRecentActivity: mostRecent,
            storageSize,
            topCategories: this.extractTopCategories(memories),
            memoryGrowthRate,
            retrievalPatterns: {}
        };
    }

    private extractTopCategories(memories: MemoryItem[]): Array<{category: string, count: number}> {
        const categories = new Map<string, number>();

        for (const memory of memories) {
            if (memory.metadata?.categories) {
                for (const cat of memory.metadata.categories) {
                    categories.set(cat, (categories.get(cat) || 0) + 1);
                }
            }
        }

        return Array.from(categories.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    generateInsights(analytics: MemoryAnalytics): string[] {
        const insights: string[] = [];

        if (analytics.memoryGrowthRate > 10) {
            insights.push(`High memory growth: ${analytics.memoryGrowthRate.toFixed(1)} memories/day. Consider enabling consolidation.`);
        }

        if (analytics.averageAge > 90) {
            insights.push(`Old memories detected (avg ${analytics.averageAge.toFixed(0)} days). Consider archiving or compression.`);
        }

        if (analytics.storageSize > 1000000) {
            insights.push(`Storage size: ${(analytics.storageSize / 1024 / 1024).toFixed(1)}MB. Consider optimization.`);
        }

        const preferenceRatio = (analytics.memoryByType.preference || 0) / analytics.totalMemories;
        if (preferenceRatio < 0.1) {
            insights.push('Few preference memories detected. Consider tracking user preferences more explicitly.');
        }

        return insights;
    }
}
