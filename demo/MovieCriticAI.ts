// Problem: Can't remember which movies you've seen or liked
// Solution: AI that tracks your taste and suggests perfect matches

import {MemoryItem, SQLiteStorageAdapter} from "../src";
import {AdvancedMemoryManager} from "../src/infra/advanced/AdvancedMemoryManager";

class MovieMemory {
    private memory: AdvancedMemoryManager;

    constructor() {
        this.memory = new AdvancedMemoryManager({
            storage: new SQLiteStorageAdapter('./movies.db'),
            enableGraph: true,
            enableMemoryReasoning: true,
            enableHierarchy: true
        });
    }

    async rateMovie(title: string, year: number, rating: number, thoughts: string) {
        await this.memory.remember({
            type: 'summary',
            content: `${title} (${year}): ${thoughts}`,
            metadata: { title, year, rating, watchedDate: new Date().toISOString() }
        });
    }

    async shouldIWatch(title: string, description: string) {
        // Find similar movies you've watched
        const similar = await this.memory.recallWithGraph(description, 2);

        // Analyze if you'll like it
        return this.memory.reasoningEngine.infer(
            similar,
            `Based on past preferences, will the user enjoy: ${title}? ${description}`
        );
    }

    async findPerfectMovie(mood: string, companions?: string[]) {
        const allMovies = await this.memory.recall('', 1000);
        const highRated = allMovies.filter(m => (m.metadata?.rating || 0) >= 4);

        return this.memory.llm.generate(`
      User wants a movie for: ${mood}
      ${companions ? `Watching with: ${companions.join(', ')}` : 'Watching alone'}
      
      Their favorite movies: ${highRated.map(m => m.content).join('; ')}
      
      Suggest 3 movies they haven't seen that they'll love.
      Explain why each matches their taste.
    `);
    }

    async getTasteProfile() {
        const allMovies = await this.memory.recall('', 1000);

        const avgRating = allMovies.reduce((sum, m) =>
            sum + (m.metadata?.rating || 0), 0) / allMovies.length;

        const favorites = allMovies
            .filter(m => (m.metadata?.rating || 0) >= 4.5)
            .map(m => m.metadata?.title);

        return {
            moviesWatched: allMovies.length,
            averageRating: avgRating,
            favorites,
            watchingFrequency: this.calculateWatchingFrequency(allMovies)
        };
    }

    private calculateWatchingFrequency(movies: MemoryItem[]): string {
        if (movies.length < 2) return 'Not enough data';

        const first = new Date(movies[0].createdAt).getTime();
        const last = new Date(movies[movies.length - 1].createdAt).getTime();
        const days = (last - first) / (1000 * 60 * 60 * 24);
        const perWeek = (movies.length / days) * 7;

        return `${perWeek.toFixed(1)} movies per week`;
    }
}

// DEMO OUTPUT:
// "Should you watch Inception?"
// Confidence: 95%
// Reasoning: You loved:
// - Memento (similar director, mind-bending)
// - The Matrix (sci-fi, philosophical)
// - Shutter Island (psychological thriller)
// Prediction: You'll rate it 4.5/5