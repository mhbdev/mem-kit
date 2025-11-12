import {MemoryManager} from "../application/MemoryManager.js";
import {InMemoryStorageAdapter} from "../infra/storage/InMemoryStorageAdapter.js";
import {KeywordRetrievalStrategy} from "../infra/retrieval/KeywordRetrievalStrategy.js";
import {MemoryItemInput, MemoryItem} from "../domain/models/MemoryItem.js";

type Pricing = { inputPerTokenUSD: number; outputPerTokenUSD: number };

const defaultPricing: Pricing = {
  // Example pricing, adjust per your target model
  inputPerTokenUSD: 0.000005,  // $5 per million tokens
  outputPerTokenUSD: 0.000015, // $15 per million tokens
};

function approxTokens(text: string): number {
  // Rough approximation: ~4 chars per token
  return Math.ceil(text.length / 4);
}

async function seedMemories(mm: MemoryManager, count = 100) {
  const topics = ["JavaScript", "Python", "Cooking", "Fitness", "Movies", "Books", "Dreams"]; 
  for (let i = 0; i < count; i++) {
    const t = topics[i % topics.length];
    const input: MemoryItemInput = {
      type: "event",
      content: `User noted something about ${t} #${i}`,
      metadata: { topic: t, idx: i },
    };
    await mm.remember(input);
  }
}

async function naiveLLMStrategyCost(query: string, all: MemoryItem[], pricing = defaultPricing) {
  const prompt = `Answer the question using the entire history.\n\nMemories:\n${all.map((m: MemoryItem) => `- ${m.content}`).join("\n")}\n\nQuestion: ${query}`;
  const tokens = approxTokens(prompt);
  const costUSD = tokens * pricing.inputPerTokenUSD;
  return { tokens, costUSD, promptLength: prompt.length };
}

async function memKitRetrievalCost(query: string, mm: MemoryManager, limit = 10, pricing = defaultPricing) {
  const retrieved = await mm.recall(query, limit);
  const prompt = `Answer using only these relevant memories:\n${retrieved.map(m => `- ${m.content}`).join("\n")}\n\nQuestion: ${query}`;
  const tokens = approxTokens(prompt);
  const costUSD = tokens * pricing.inputPerTokenUSD;
  return { tokens, costUSD, promptLength: prompt.length, retrievedCount: retrieved.length };
}

async function run() {
  const storage = new InMemoryStorageAdapter();
  const mm = new MemoryManager({
    storage,
    retrieval: new KeywordRetrievalStrategy(),
    options: { autoEmbed: false },
  });

  await seedMemories(mm, 200);

  const query = "Recommend a workout plan about fitness";
  const allMemories = await storage.getAll();
  const naive = await naiveLLMStrategyCost(query, allMemories);
  const optimized = await memKitRetrievalCost(query, mm, 12);

  const savingsTokens = naive.tokens - optimized.tokens;
  const savingsUSD = naive.costUSD - optimized.costUSD;
  const savingsPct = ((naive.tokens - optimized.tokens) / naive.tokens) * 100;

  console.log("Benchmark: Memory Prompt Cost Optimization");
  console.log("Query:", query);
  console.log("Naive tokens:", naive.tokens, "costUSD:", naive.costUSD.toFixed(6));
  console.log("Optimized tokens:", optimized.tokens, "costUSD:", optimized.costUSD.toFixed(6));
  console.log("Savings tokens:", savingsTokens, `(${savingsPct.toFixed(1)}%)`);
  console.log("Savings USD:", savingsUSD.toFixed(6));
  console.log("Retrieved items:", optimized.retrievedCount);
}

run().catch(err => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});