import {
    ILLMAdapter,
    InMemoryStorageAdapter,
    KeywordRetrievalStrategy,
    MemoryManager,
    MockEmbeddingAdapter
} from "../src";

describe('MemoryManager', () => {
    let memory: MemoryManager;

    beforeEach(() => {
        memory = new MemoryManager({
            storage: new InMemoryStorageAdapter(),
            embedder: new MockEmbeddingAdapter(),
            retrieval: new KeywordRetrievalStrategy(),
        });
    });

    describe('remember()', () => {
        it('should store a new memory item', async () => {
            const item = await memory.remember({
                type: 'fact',
                content: 'User likes pizza',
            });

            expect(item.id).toBeDefined();
            expect(item.type).toBe('fact');
            expect(item.content).toBe('User likes pizza');
            expect(item.createdAt).toBeDefined();
        });

        it('should auto-generate embeddings when enabled', async () => {
            const item = await memory.remember({
                type: 'preference',
                content: 'User prefers dark mode',
            });

            expect(item.embedding).toBeDefined();
            expect(Array.isArray(item.embedding)).toBe(true);
            expect(item.embedding!.length).toBeGreaterThan(0);
        });

        it('should store metadata', async () => {
            const item = await memory.remember({
                type: 'event',
                content: 'User attended conference',
                metadata: { location: 'San Francisco', year: 2024 },
            });

            expect(item.metadata).toEqual({ location: 'San Francisco', year: 2024 });
        });
    });

    describe('recall()', () => {
        beforeEach(async () => {
            await memory.remember({ type: 'fact', content: 'User likes JavaScript' });
            await memory.remember({ type: 'fact', content: 'User enjoys TypeScript' });
            await memory.remember({ type: 'preference', content: 'User prefers VSCode' });
        });

        it('should retrieve relevant memories', async () => {
            const results = await memory.recall('programming languages');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should respect limit parameter', async () => {
            const results = await memory.recall('user', 2);
            expect(results.length).toBeLessThanOrEqual(2);
        });

        it('should return empty array when no memories exist', async () => {
            const emptyMemory = new MemoryManager({
                storage: new InMemoryStorageAdapter(),
            });
            const results = await emptyMemory.recall('anything');
            expect(results).toEqual([]);
        });
    });

    describe('summarize()', () => {
        let mockLLM: jest.Mocked<ILLMAdapter>;

        beforeEach(async () => {
            mockLLM = {
                generate: jest.fn().mockResolvedValue('User is interested in web development'),
            };

            memory = new MemoryManager({
                storage: new InMemoryStorageAdapter(),
                llm: mockLLM,
            });

            await memory.remember({ type: 'fact', content: 'User knows React' });
            await memory.remember({ type: 'fact', content: 'User learning TypeScript' });
        });

        it('should generate summary using LLM', async () => {
            const summary = await memory.summarize();
            expect(summary).toBe('User is interested in web development');
            expect(mockLLM.generate).toHaveBeenCalled();
        });

        it('should filter by memory type', async () => {
            await memory.remember({ type: 'preference', content: 'User likes coffee' });
            await memory.summarize({ type: 'fact' });

            const callArg = mockLLM.generate.mock.calls[0][0];
            expect(callArg).toContain('[fact]');
            expect(callArg).not.toContain('coffee');
        });

        it('should throw error if LLM not configured', async () => {
            const noLLMMemory = new MemoryManager({
                storage: new InMemoryStorageAdapter(),
            });

            await expect(noLLMMemory.summarize()).rejects.toThrow(
                'LLM adapter required for summarization'
            );
        });
    });

    describe('forget()', () => {
        it('should delete existing memory', async () => {
            const item = await memory.remember({ type: 'fact', content: 'Temporary fact' });
            const deleted = await memory.forget(item.id);

            expect(deleted).toBe(true);

            const retrieved = await memory.inspect(item.id);
            expect(retrieved).toBeNull();
        });

        it('should return false for non-existent memory', async () => {
            const deleted = await memory.forget('non-existent-id');
            expect(deleted).toBe(false);
        });
    });

    describe('inspect()', () => {
        it('should retrieve specific memory by id', async () => {
            const item = await memory.remember({ type: 'fact', content: 'Specific fact' });
            const retrieved = await memory.inspect(item.id);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe(item.id);
            expect(retrieved!.content).toBe('Specific fact');
        });

        it('should return null for non-existent id', async () => {
            const retrieved = await memory.inspect('non-existent-id');
            expect(retrieved).toBeNull();
        });
    });

    describe('clear()', () => {
        it('should remove all memories', async () => {
            await memory.remember({ type: 'fact', content: 'Fact 1' });
            await memory.remember({ type: 'fact', content: 'Fact 2' });

            await memory.clear();

            const results = await memory.recall('fact');
            expect(results).toEqual([]);
        });
    });

    describe('memory decay', () => {
        it('should apply decay when enabled', async () => {
            const decayMemory = new MemoryManager({
                storage: new InMemoryStorageAdapter(),
                options: { enableDecay: true, decayFactor: 0.9 },
            });

            await decayMemory.remember({ type: 'fact', content: 'Old memory' });
            const results = await decayMemory.recall('memory');

            expect(results[0].relevance).toBeDefined();
        });
    });
});