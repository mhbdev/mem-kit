import { randomUUID } from "crypto";
import {IStorageAdapter} from "../domain/ports/IStorageAdapter";
import {IEmbeddingAdapter} from "../domain/ports/IEmbeddingAdapter";
import {ILLMAdapter} from "../domain/ports/ILLMAdapter";
import {IRetrievalStrategy} from "../domain/ports/IRetrievalStrategy";
import {ITimeProvider} from "../domain/ports/ITimeProvider";
import {ILogger} from "../domain/ports/ILogger";
import {MemoryConfig} from "./config/MemoryConfig";
import {SimpleTimeProvider} from "../infra/utilities/SimpleTimeProvider";
import {ConsoleLogger} from "../infra/utilities/ConsoleLogger";

export class MemoryManager {
    private storage: IStorageAdapter;
    private embedder?: IEmbeddingAdapter;
    private llm?: ILLMAdapter;
    private retrieval?: IRetrievalStrategy;
    private timeProvider: ITimeProvider;
    private logger: ILogger;
    private options: Required<MemoryConfig["options"]>;

    constructor(config: MemoryConfig) {
        this.storage = config.storage;
        this.embedder = config.embedder;
        this.llm = config.llm;
        this.retrieval = config.retrieval;
        this.timeProvider = config.timeProvider || new SimpleTimeProvider();
        this.logger = config.logger || new ConsoleLogger();

        this.options = {
            autoEmbed: config.options?.autoEmbed ?? true,
            defaultRetrievalLimit: config.options?.defaultRetrievalLimit ?? 10,
            enableDecay: config.options?.enableDecay ?? false,
            decayFactor: config.options?.decayFactor ?? 0.95,
        };
    }

    /**
     * Store a new memory item
     */
    async remember(input: MemoryItemInput): Promise<MemoryItem> {
        this.logger.debug("Remembering new item", { type: input.type });

        const item: MemoryItem = {
            id: randomUUID(),
            type: input.type,
            content: input.content,
            metadata: input.metadata,
            source: input.source,
            createdAt: this.timeProvider.now(),
        };

        // Auto-embed if enabled and embedder available
        if (this.options.autoEmbed && this.embedder) {
            try {
                item.embedding = await this.embedder.embed(input.content);
                this.logger.debug("Embedding generated", { id: item.id });
            } catch (error) {
                this.logger.warn("Failed to generate embedding", { error });
            }
        }

        await this.storage.save(item);
        this.logger.info("Memory stored", { id: item.id, type: item.type });

        return item;
    }

    /**
     * Retrieve relevant memories for a query
     */
    async recall(query: string, limit?: number): Promise<MemoryItem[]> {
        this.logger.debug("Recalling memories", { query });

        const allItems = await this.storage.getAll();

        if (allItems.length === 0) {
            this.logger.info("No memories found");
            return [];
        }

        // Apply decay if enabled
        const items = this.options.enableDecay
            ? this.applyDecay(allItems)
            : allItems;

        // Use retrieval strategy if provided
        if (this.retrieval) {
            const retrieved = await this.retrieval.retrieve(
                query,
                items,
                limit || this.options.defaultRetrievalLimit
            );
            this.logger.info("Memories recalled via strategy", { count: retrieved.length });
            return retrieved;
        }

        // Fallback: return all items
        const result = items.slice(0, limit || this.options.defaultRetrievalLimit);
        this.logger.info("Memories recalled (no strategy)", { count: result.length });
        return result;
    }

    /**
     * Generate a summary of memories
     */
    async summarize(scope?: { type?: MemoryType; limit?: number }): Promise<string> {
        this.logger.debug("Summarizing memories", { scope });

        if (!this.llm) {
            throw new Error("LLM adapter required for summarization");
        }

        let items = await this.storage.getAll();

        if (scope?.type) {
            items = items.filter((item) => item.type === scope.type);
        }

        if (scope?.limit) {
            items = items.slice(0, scope.limit);
        }

        if (items.length === 0) {
            return "No memories to summarize.";
        }

        const memoriesText = items
            .map((item) => `[${item.type}] ${item.content}`)
            .join("\n");

        const prompt = `Summarize the following memories:\n\n${memoriesText}\n\nProvide a concise summary:`;

        const summary = await this.llm.generate(prompt);
        this.logger.info("Summary generated", { itemCount: items.length });

        return summary;
    }

    /**
     * Delete a memory by ID
     */
    async forget(id: string): Promise<boolean> {
        this.logger.debug("Forgetting memory", { id });
        const deleted = await this.storage.delete(id);

        if (deleted) {
            this.logger.info("Memory forgotten", { id });
        } else {
            this.logger.warn("Memory not found for deletion", { id });
        }

        return deleted;
    }

    /**
     * Inspect a specific memory
     */
    async inspect(id: string): Promise<MemoryItem | null> {
        this.logger.debug("Inspecting memory", { id });
        return this.storage.get(id);
    }

    /**
     * Clear all memories
     */
    async clear(): Promise<void> {
        this.logger.warn("Clearing all memories");
        await this.storage.clear();
    }

    /**
     * Apply time-based decay to memory relevance
     */
    private applyDecay(items: MemoryItem[]): MemoryItem[] {
        const now = new Date(this.timeProvider.now()).getTime();

        return items.map((item) => {
            const created = new Date(item.createdAt).getTime();
            const daysSince = (now - created) / (1000 * 60 * 60 * 24);
            const decay = Math.pow(this.options.decayFactor, daysSince);

            return {
                ...item,
                relevance: decay,
            };
        });
    }
}
