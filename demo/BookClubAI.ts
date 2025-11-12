// Problem: Want to discuss books but friends haven't read them
// Solution: AI that remembers every book you've read and discusses them

import {AdvancedMemoryManager} from "../src/infra/advanced/AdvancedMemoryManager";
import {OpenAIAdapter, OpenAIEmbeddingAdapter, SQLiteStorageAdapter} from "../src";

class BookClubAI {
    private memory: AdvancedMemoryManager;

    constructor() {
        this.memory = new AdvancedMemoryManager({
            storage: new SQLiteStorageAdapter('./books.db'),
            embedder: new OpenAIEmbeddingAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
            llm: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
            enableGraph: true,
            enableHierarchy: true
        });
    }

    async finishBook(title: string, author: string, thoughts: string, rating: number) {
        await this.memory.remember({
            type: 'summary',
            content: `Book: ${title} by ${author}. Thoughts: ${thoughts}`,
            metadata: { title, author, rating, finishedDate: new Date().toISOString() }
        });
    }

    async discuss(topic: string) {
        // Find relevant books from your reading history
        const relevantBooks = await this.memory.recallWithGraph(topic, 2);

        // Generate discussion using your reading history
        return this.memory.generate(`
      The user wants to discuss: ${topic}
      
      Their reading history includes:
      ${relevantBooks.map(b => b.content).join('\n')}
      
      Generate an engaging response that:
      1. References specific books they've read
      2. Connects themes across their reading
      3. Asks thoughtful follow-up questions
      4. Suggests related books they might like
    `);
    }

    async findConnections(book1: string, book2: string) {
        const memories1 = await this.memory.recall(book1);
        const memories2 = await this.memory.recall(book2);
        const combined = [...memories1, ...memories2].map(m => `- ${m.content}`).join('\n');
        return this.memory.generate(`Analyze connections between these books:\n${combined}`);
    }

    async getReadingInsights() {
        const allBooks = await this.memory.recall('Book:', 1000);

        return this.memory.generate(`
      Analyze this reading history:
      ${allBooks.map(b => b.content).join('\n')}
      
      Identify:
      1. Favorite genres and themes
      2. Reading patterns over time
      3. Evolution of interests
      4. Books that shaped their thinking
    `);
    }
}

// DEMO OUTPUT:
// User: "What did I think about AI ethics?"
// AI: "Great question! You explored this in 'Life 3.0' where you noted
//      concerns about alignment. This connects to your thoughts on
//      'Superintelligence' about control problems. Have you considered
//      reading 'The Alignment Problem'? It bridges both books."
