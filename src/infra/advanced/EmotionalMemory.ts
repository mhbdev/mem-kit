// Remember emotions and sentiment over time

import {MemoryItem, MemoryType} from "../../domain/models/MemoryItem";

export interface EmotionalMemory extends MemoryItem {
    emotion: {
        primary: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'neutral';
        intensity: number; // 0-1
        valence: number;   // -1 to 1 (negative to positive)
        arousal: number;   // 0-1 (calm to excited)
    };
}

export class EmotionalMemoryTracker {
    constructor(private sentimentAnalyzer: ISentimentAnalyzer) {}

    async addEmotionalMemory(
        content: string,
        type: MemoryType
    ): Promise<EmotionalMemory> {
        const emotion = await this.sentimentAnalyzer.analyze(content);

        return {
            id: `emotion_${Date.now()}`,
            type,
            content,
            emotion,
            createdAt: new Date().toISOString()
        };
    }

    async getEmotionalTimeline(
        memories: EmotionalMemory[]
    ): Promise<Array<{date: string, avgValence: number, avgArousal: number}>> {
        const byDate = new Map<string, EmotionalMemory[]>();

        for (const mem of memories) {
            const date = mem.createdAt.split('T')[0];
            if (!byDate.has(date)) byDate.set(date, []);
            byDate.get(date)!.push(mem);
        }

        const timeline = [];
        for (const [date, mems] of byDate) {
            const avgValence = mems.reduce((sum, m) => sum + m.emotion.valence, 0) / mems.length;
            const avgArousal = mems.reduce((sum, m) => sum + m.emotion.arousal, 0) / mems.length;

            timeline.push({ date, avgValence, avgArousal });
        }

        return timeline.sort((a, b) => a.date.localeCompare(b.date));
    }

    detectMoodPatterns(timeline: Array<{date: string, avgValence: number}>): string[] {
        const patterns: string[] = [];

        // Detect trends
        if (timeline.length >= 7) {
            const recent = timeline.slice(-7);
            const trend = recent[recent.length - 1].avgValence - recent[0].avgValence;

            if (trend > 0.3) patterns.push('improving_mood');
            if (trend < -0.3) patterns.push('declining_mood');
        }

        // Detect volatility
        const volatility = this.calculateVolatility(timeline.map(t => t.avgValence));
        if (volatility > 0.5) patterns.push('high_volatility');

        return patterns;
    }

    private calculateVolatility(values: number[]): number {
        if (values.length < 2) return 0;

        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

        return Math.sqrt(variance);
    }
}

interface ISentimentAnalyzer {
    analyze(text: string): Promise<EmotionalMemory['emotion']>;
}