// Organize memories in categories and subcategories

import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";
import {MemoryItem} from "../../domain/models/MemoryItem";

export interface MemoryHierarchy {
    category: string;
    subcategories: Map<string, MemoryHierarchy>;
    memories: string[]; // memory IDs
}

export class HierarchicalMemoryOrganizer {
    private hierarchy: MemoryHierarchy;

    constructor(private llm: ILLMAdapter) {
        this.hierarchy = {
            category: 'root',
            subcategories: new Map(),
            memories: []
        };
    }

    async organize(memory: MemoryItem): Promise<string[]> {
        // Use LLM to classify into categories
        const prompt = `Classify this memory into categories (2-3 levels deep):

Memory: ${memory.content}

Return a JSON array of category paths, like:
["personal/preferences/food", "personal/lifestyle"]

Be specific but not overly granular.`;

        const response = await this.llm.generate(prompt);
        const categories: string[] = JSON.parse(response);

        // Add to hierarchy
        for (const categoryPath of categories) {
            this.addToHierarchy(categoryPath.split('/'), memory.id);
        }

        return categories;
    }

    private addToHierarchy(path: string[], memoryId: string): void {
        let current = this.hierarchy;

        for (const category of path) {
            if (!current.subcategories.has(category)) {
                current.subcategories.set(category, {
                    category,
                    subcategories: new Map(),
                    memories: []
                });
            }
            current = current.subcategories.get(category)!;
        }

        current.memories.push(memoryId);
    }

    getByCategory(categoryPath: string): string[] {
        const path = categoryPath.split('/');
        let current = this.hierarchy;

        for (const category of path) {
            const next = current.subcategories.get(category);
            if (!next) return [];
            current = next;
        }

        // Return all memories in this category and subcategories
        return this.collectAllMemories(current);
    }

    private collectAllMemories(node: MemoryHierarchy): string[] {
        const memories = [...node.memories];

        for (const subcategory of node.subcategories.values()) {
            memories.push(...this.collectAllMemories(subcategory));
        }

        return memories;
    }
}