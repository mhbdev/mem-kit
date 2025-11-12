# 🧠 MemKit

> Minimal, Pluggable LLM Memory SDK

**MemKit** is a lightweight, extensible TypeScript SDK that gives your AI applications and LLM agents persistent, searchable memory. Built with clean architecture principles, it provides a simple API while remaining fully customizable through pluggable adapters.

---

## ✨ Features

- 🔌 **Fully Pluggable**: Swap storage, embeddings, LLM, and retrieval strategies
- 🏗️ **Clean Architecture**: Domain-driven design with clear separation of concerns
- 🚀 **Zero to Hero**: Start with in-memory storage, scale to production databases
- 🎯 **Type-Safe**: 100% TypeScript with complete type definitions
- 🧪 **Well-Tested**: Comprehensive test suite with 85%+ coverage
- 📦 **Minimal Dependencies**: Lightweight and production-ready
- 🔍 **Multiple Retrieval Strategies**: Keyword search, semantic search, or custom

---

## 📦 Installation

```bash
npm install MemKit
```

Or with yarn:
```bash
yarn add MemKit
```

---

## 🚀 Quickstart

```typescript
import { 
  MemoryManager, 
  InMemoryStorageAdapter, 
  MockEmbeddingAdapter,
  KeywordRetrievalStrategy 
} from "MemKit";

// Initialize memory system
const memory = new MemoryManager({
  storage: new InMemoryStorageAdapter(),
  embedder: new MockEmbeddingAdapter(),
  retrieval: new KeywordRetrievalStrategy()
});

// Store memories
await memory.remember({ 
  type: "preference", 
  content: "User loves sci-fi movies, especially Blade Runner" 
});

await memory.remember({ 
  type: "fact", 
  content: "User is learning TypeScript and React" 
});

// Recall relevant memories
const results = await memory.recall("What does the user like?");
console.log(results);

// Inspect specific memory
const details = await memory.inspect(results[0].id);
console.log(details);
```

---

## 🏗️ Architecture

MemKit follows clean architecture principles with clear layer separation:

```
┌─────────────────────────────────────────────────────────────┐
│                        SDK Layer                             │
│  Public API: MemoryManager + Adapter Exports                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  Business Logic: MemoryManager, Use Cases                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  Core Models & Interfaces (Ports)                           │
│  • MemoryItem, MemoryType                                   │
│  • IStorageAdapter, IEmbeddingAdapter                       │
│  • ILLMAdapter, IRetrievalStrategy                          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  Concrete Implementations (Adapters)                        │
│  • Storage: InMemory, SQLite                                │
│  • Embeddings: OpenAI, Mock                                 │
│  • LLM: OpenAI                                              │
│  • Retrieval: Keyword, Embedding                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Concepts

### Memory Types

MemKit supports five core memory types:

- **`fact`**: Factual information about the user or context
- **`preference`**: User preferences and likes/dislikes
- **`event`**: Time-based events or interactions
- **`summary`**: Condensed summaries of multiple memories
- **`todo`**: Tasks or action items

### Memory Item Structure

```typescript
interface MemoryItem {
  id: string;                    // Unique identifier
  type: MemoryType;              // Memory classification
  content: string;               // The actual memory content
  embedding?: number[];          // Vector embedding (optional)
  metadata?: Record<string, any>; // Additional context
  createdAt: string;             // ISO timestamp
  updatedAt?: string;            // Last modification time
  relevance?: number;            // Decay score (0-1)
  source?: string;               // Origin of memory
}
```

---

## 🎮 Usage Guide

### Basic Operations

#### Storing Memories

```typescript
// Simple memory
await memory.remember({ 
  type: "fact", 
  content: "User's favorite color is blue" 
});

// With metadata
await memory.remember({ 
  type: "event", 
  content: "User attended NodeConf 2024",
  metadata: { 
    location: "Austin, TX",
    attendees: 500 
  }
});

// With source tracking
await memory.remember({ 
  type: "preference", 
  content: "User prefers dark mode",
  source: "settings_page"
});
```

#### Retrieving Memories

```typescript
// Basic recall
const memories = await memory.recall("user preferences");

// With limit
const top5 = await memory.recall("JavaScript", 5);

// Inspect specific memory
const item = await memory.inspect("memory-id-here");
```

#### Managing Memories

```typescript
// Forget a specific memory
await memory.forget("memory-id");

// Clear all memories
await memory.clear();
```

#### Generating Summaries

```typescript
// Requires LLM adapter
const summary = await memory.summarize();

// Filter by type
const factSummary = await memory.summarize({ type: "fact" });

// Limit items
const recentSummary = await memory.summarize({ limit: 10 });
```

---

## 🔌 Built-in Adapters

### Storage Adapters

#### InMemoryStorageAdapter
Perfect for development, testing, or ephemeral sessions.

```typescript
import { InMemoryStorageAdapter } from "MemKit";

const storage = new InMemoryStorageAdapter();
```

#### SQLiteStorageAdapter
Production-ready persistent storage.

```typescript
import { SQLiteStorageAdapter } from "MemKit";

// In-memory database
const storage = new SQLiteStorageAdapter(":memory:");

// Persistent file
const storage = new SQLiteStorageAdapter("./memories.db");
```

### Embedding Adapters

#### OpenAIEmbeddingAdapter
Real semantic search with OpenAI embeddings.

```typescript
import { OpenAIEmbeddingAdapter } from "MemKit";

const embedder = new OpenAIEmbeddingAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: "text-embedding-3-small" // Default
});
```

#### MockEmbeddingAdapter
Deterministic embeddings for testing.

```typescript
import { MockEmbeddingAdapter } from "MemKit";

const embedder = new MockEmbeddingAdapter(1536); // Dimension
```

### LLM Adapters

#### OpenAIAdapter
Text generation and summarization.

```typescript
import { OpenAIAdapter } from "MemKit";

const llm = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini"
});
```

### Retrieval Strategies

#### KeywordRetrievalStrategy
Fast, simple keyword matching.

```typescript
import { KeywordRetrievalStrategy } from "MemKit";

const retrieval = new KeywordRetrievalStrategy();
```

#### EmbeddingRetrievalStrategy
Semantic similarity search using embeddings.

```typescript
import { EmbeddingRetrievalStrategy } from "MemKit";

const retrieval = new EmbeddingRetrievalStrategy(embedder);
```

---

## 🛠️ Advanced Usage

### Production Configuration

```typescript
import {
  MemoryManager,
  SQLiteStorageAdapter,
  OpenAIEmbeddingAdapter,
  OpenAIAdapter,
  EmbeddingRetrievalStrategy,
  ConsoleLogger
} from "MemKit";

const embedder = new OpenAIEmbeddingAdapter({
  apiKey: process.env.OPENAI_API_KEY
});

const memory = new MemoryManager({
  storage: new SQLiteStorageAdapter("./prod-memories.db"),
  embedder: embedder,
  llm: new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY
  }),
  retrieval: new EmbeddingRetrievalStrategy(embedder),
  logger: new ConsoleLogger(),
  options: {
    autoEmbed: true,
    defaultRetrievalLimit: 10,
    enableDecay: true,
    decayFactor: 0.95
  }
});
```

### Memory Decay

Enable time-based relevance decay:

```typescript
const memory = new MemoryManager({
  storage: new InMemoryStorageAdapter(),
  options: {
    enableDecay: true,
    decayFactor: 0.95 // Daily decay rate
  }
});
```

Older memories will have lower relevance scores over time.

---

## 🎨 Writing Custom Adapters

MemKit is designed for extensibility. Here's how to create custom adapters:

### Custom Storage Adapter

```typescript
import { IStorageAdapter, MemoryItem } from "MemKit";

class RedisStorageAdapter implements IStorageAdapter {
  private client: RedisClient;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
  }

  async save(item: MemoryItem): Promise<void> {
    await this.client.set(
      `memory:${item.id}`, 
      JSON.stringify(item)
    );
  }

  async get(id: string): Promise<MemoryItem | null> {
    const data = await this.client.get(`memory:${id}`);
    return data ? JSON.parse(data) : null;
  }

  async getAll(): Promise<MemoryItem[]> {
    const keys = await this.client.keys("memory:*");
    const items = await Promise.all(
      keys.map(key => this.client.get(key))
    );
    return items
      .filter(Boolean)
      .map(data => JSON.parse(data!));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.client.del(`memory:${id}`);
    return result > 0;
  }

  async clear(): Promise<void> {
    const keys = await this.client.keys("memory:*");
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
```

### Custom Retrieval Strategy

```typescript
import { IRetrievalStrategy, MemoryItem } from "MemKit";

class HybridRetrievalStrategy implements IRetrievalStrategy {
  constructor(
    private keywordWeight: number = 0.3,
    private semanticWeight: number = 0.7
  ) {}

  async retrieve(
    query: string,
    items: MemoryItem[],
    limit: number = 10
  ): Promise<MemoryItem[]> {
    // Combine keyword and semantic scores
    const scored = items.map(item => {
      const keywordScore = this.getKeywordScore(query, item);
      const semanticScore = this.getSemanticScore(query, item);
      
      return {
        item,
        score: (keywordScore * this.keywordWeight) + 
               (semanticScore * this.semanticWeight)
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.item);
  }

  private getKeywordScore(query: string, item: MemoryItem): number {
    // Implementation...
  }

  private getSemanticScore(query: string, item: MemoryItem): number {
    // Implementation...
  }
}
```

---

## 🧪 Testing

Run the test suite:

```bash
npm test
```

With coverage:

```bash
npm run test:coverage
```

MemKit includes comprehensive tests for:
- MemoryManager core logic
- All built-in adapters
- Retrieval strategies
- Edge cases and error handling

---

## 📊 Performance Considerations

### Storage

- **InMemory**: Fastest, but lost on restart. Great for sessions.
- **SQLite**: Good balance of speed and persistence. Suitable for most apps.
- **Custom (Redis, Postgres)**: Best for distributed systems and high scale.

### Embeddings

- **Mock**: Instant, but not semantically meaningful. Use for testing.
- **OpenAI**: High quality, ~100ms per embedding. Batch when possible.

### Retrieval

- **Keyword**: ~1ms for 1000 items. Fast but limited accuracy.
- **Embedding**: ~10ms for 1000 items. Slower but semantically accurate.

---

## 🗺️ Roadmap

- [ ] PostgreSQL adapter with pgvector
- [ ] Pinecone/Weaviate vector DB adapters
- [ ] Conversation threading/context management
- [ ] Memory importance scoring
- [ ] Automatic memory consolidation
- [ ] Multi-user memory isolation
- [ ] Memory export/import utilities
- [ ] React hooks for client-side usage

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Ensure all tests pass and coverage remains above 85%.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with inspiration from:
- [LangChain Memory](https://js.langchain.com/docs/modules/memory/)
- [Zep](https://www.getzep.com/)
- Clean Architecture principles by Robert C. Martin

---

## 💬 Support

- 📖 [Documentation](https://github.com/yourusername/MemKit/wiki)
- 🐛 [Issue Tracker](https://github.com/yourusername/MemKit/issues)
- 💬 [Discussions](https://github.com/yourusername/MemKit/discussions)

---

## 🎯 Examples

Check out the `/examples` directory for:

- **basic.ts**: Simple usage with in-memory storage
- **advanced.ts**: Production configuration with OpenAI
- **custom-adapters.ts**: Building your own adapters
- **inspector/**: Web-based memory browser (bonus!)

---

**Made with ❤️ for the AI community**