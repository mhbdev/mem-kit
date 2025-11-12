// Problem: Recipe apps don't learn your preferences
// Solution: AI that remembers what you cooked and adapts suggestions

import {MemoryItem, SQLiteStorageAdapter} from "../src";
import {AdvancedMemoryManager} from "../src/infra/advanced/AdvancedMemoryManager";

class CookingMemory {
    private memory: AdvancedMemoryManager;

    constructor() {
        this.memory = new AdvancedMemoryManager({
            storage: new SQLiteStorageAdapter('./cooking.db'),
            enableImportanceScoring: true,
            enableGraph: true,
            enableAdaptiveLearning: true
        });
    }

    async logMeal(dish: string, rating: number, notes: string, ingredients: string[]) {
        const importance = rating / 5; // Higher rated meals are more important

        await this.memory.remember({
            type: 'event',
            content: `Cooked ${dish}: ${notes}`,
            metadata: {
                dish,
                rating,
                ingredients,
                date: new Date().toISOString(),
                importance
            }
        });
    }

    async suggestRecipe(ingredients: string[]) {
        // Find successful past meals with similar ingredients
        const similarMeals = await Promise.all(
            ingredients.map(ing => this.memory.recall(ing))
        );

        const successful = similarMeals
            .flat()
            .filter(m => (m.metadata?.rating || 0) >= 4);

        return this.memory.llm.generate(`
      User has these ingredients: ${ingredients.join(', ')}
      
      They previously enjoyed:
      ${successful.map(m => `${m.content} (${m.metadata?.rating}/5)`).join('\n')}
      
      Suggest a recipe that:
      1. Uses available ingredients
      2. Matches their taste preferences
      3. Is similar to dishes they loved
      4. Introduces one new flavor they might enjoy
    `);
    }

    async getTasteProfile() {
        const allMeals = await this.memory.recall('Cooked', 1000);

        // Analyze preferences
        const highRated = allMeals.filter(m => (m.metadata?.rating || 0) >= 4);
        const ingredients = highRated.flatMap(m => m.metadata?.ingredients || []);

        const ingredientCounts = ingredients.reduce((acc, ing) => {
            acc[ing] = (acc[ing] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            favoriteIngredients: Object.entries(ingredientCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10),
            cookingFrequency: allMeals.length / this.getDaysSinceFirstMeal(allMeals),
            averageRating: allMeals.reduce((sum, m) => sum + (m.metadata?.rating || 0), 0) / allMeals.length
        };
    }

    private getDaysSinceFirstMeal(meals: MemoryItem[]): number {
        if (meals.length === 0) return 1;
        const first = new Date(meals[0].createdAt).getTime();
        const now = Date.now();
        return (now - first) / (1000 * 60 * 60 * 24);
    }
}

// DEMO OUTPUT:
// "Your Taste Evolution"
// - Started cooking: Pasta with tomato sauce (3.5/5)
// - 3 months later: Homemade pasta with complex sauce (4.8/5)
// - AI Notice: "You've developed a preference for garlic (+60%),
//   fresh herbs (+45%), and umami flavors. Suggest trying miso?"
