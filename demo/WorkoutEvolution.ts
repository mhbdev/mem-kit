// Problem: Fitness apps don't learn what exercises you enjoy/avoid
// Solution: AI that adapts workouts to your preferences and progress

import {AdvancedMemoryManager} from "../src/infra/advanced/AdvancedMemoryManager";
import {SQLiteStorageAdapter} from "../src";

class WorkoutMemory {
    private memory: AdvancedMemoryManager;

    constructor() {
        this.memory = new AdvancedMemoryManager({
            storage: new SQLiteStorageAdapter('./workouts.db'),
            enableAdaptiveLearning: true,
            enableGraph: true,
            enableAnalytics: true
        });
    }

    async logWorkout(exercises: string[], duration: number, feeling: string, energy: number) {
        await this.memory.remember({
            type: 'event',
            content: `Workout: ${exercises.join(', ')}. Felt: ${feeling}`,
            metadata: {
                exercises,
                duration,
                feeling,
                energy, // 1-10
                date: new Date().toISOString()
            }
        });
    }

    async planNextWorkout(availableTime: number, equipment: string[]) {
        // Find what works well
        const goodWorkouts = await this.memory.recall('Felt: great', 20);
        const enjoyedExercises = goodWorkouts
            .flatMap(w => w.metadata?.exercises || []);

        // Find what to avoid
        const badWorkouts = await this.memory.recall('Felt: terrible', 20);
        const avoidExercises = badWorkouts
            .flatMap(w => w.metadata?.exercises || []);

        return this.memory.llm.generate(`
      Plan a ${availableTime} minute workout with: ${equipment.join(', ')}
      
      User enjoys: ${enjoyedExercises.join(', ')}
      User dislikes: ${avoidExercises.join(', ')}
      
      Create a balanced workout that:
      1. Focuses on exercises they enjoy
      2. Avoids what they dislike
      3. Matches their current fitness level
      4. Fits the time constraint
    `);
    }

    async getProgressInsights() {
        const allWorkouts = await this.memory.recall('Workout:', 1000);

        const timeline = allWorkouts.map(w => ({
            date: w.createdAt,
            energy: w.metadata?.energy || 5
        }));

        return {
            totalWorkouts: allWorkouts.length,
            averageEnergy: timeline.reduce((sum, t) => sum + t.energy, 0) / timeline.length,
            consistency: this.calculateConsistency(allWorkouts),
            improvements: await this.detectImprovements(allWorkouts)
        };
    }

    private calculateConsistency(workouts: MemoryItem[]): string {
        if (workouts.length < 4) return 'Not enough data';

        // Check if working out regularly
        const recent = workouts.slice(-4);
        const dates = recent.map(w => new Date(w.createdAt).getTime());
        const gaps = [];

        for (let i = 1; i < dates.length; i++) {
            gaps.push((dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24));
        }

        const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;

        if (avgGap < 3) return 'Very consistent (every 2-3 days)';
        if (avgGap < 5) return 'Good consistency (twice a week)';
        return 'Could be more consistent';
    }

    private async detectImprovements(workouts: MemoryItem[]) {
        // Compare first month to last month
        const firstMonth = workouts.slice(0, 10);
        const lastMonth = workouts.slice(-10);

        const firstAvgEnergy = firstMonth.reduce((sum, w) =>
            sum + (w.metadata?.energy || 5), 0) / firstMonth.length;

        const lastAvgEnergy = lastMonth.reduce((sum, w) =>
            sum + (w.metadata?.energy || 5), 0) / lastMonth.length;

        const improvement = lastAvgEnergy - firstAvgEnergy;

        if (improvement > 1) return 'Energy levels improving significantly!';
        if (improvement > 0.5) return 'Steady improvement in energy';
        return 'Maintaining consistent energy levels';
    }
}

// DEMO OUTPUT:
// "Your Fitness Journey"
// Week 1: Struggled with push-ups, energy: 4/10
// Week 4: Push-ups getting easier, energy: 6/10
// Week 8: Can do full sets, energy: 8/10
//
// AI Insight: "You've improved strength by 60%. Your energy peaks
// on Mondays. Suggest focusing on cardio to balance your routine."
