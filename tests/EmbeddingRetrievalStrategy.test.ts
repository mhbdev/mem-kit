import {EmbeddingRetrievalStrategy, MemoryItem, MockEmbeddingAdapter} from "../src";

describe('EmbeddingRetrievalStrategy', () => {
    let strategy: EmbeddingRetrievalStrategy;
    let embedder: MockEmbeddingAdapter;
    let items: MemoryItem[];

    beforeEach(async () => {
        embedder = new MockEmbeddingAdapter(64);
        strategy = new EmbeddingRetrievalStrategy(embedder);

        items = [
            {
                id: '1',
                type: 'fact',
                content: 'JavaScript is a programming language',
                embedding: await embedder.embed('JavaScript is a programming language'),
                createdAt: new Date().toISOString(),
            },
            {
                id: '2',
                type: 'fact',
                content: 'Python is used for data science',
                embedding: await embedder.embed('Python is used for data science'),
                createdAt: new Date().toISOString(),
            },
            {
                id: '3',
                type: 'preference',
                content: 'Coffee is better than tea',
                embedding: await embedder.embed('Coffee is better than tea'),
                createdAt: new Date().toISOString(),
            },
        ];
    });

    describe('retrieve()', () => {
        it('should retrieve semantically similar items', async () => {
            const results = await strategy.retrieve('programming languages', items, 5);
            expect(results.length).toBeGreaterThan(0);
        });

        it('should rank by similarity', async () => {
            const results = await strategy.retrieve('JavaScript programming', items, 5);

            // First result should be JavaScript-related
            expect(results[0].content).toContain('JavaScript');
        });

        it('should respect limit parameter', async () => {
            const results = await strategy.retrieve('programming', items, 1);
            expect(results.length).toBe(1);
        });

        it('should only consider items with embeddings', async () => {
            const itemsWithoutEmbeddings = [
                ...items,
                {
                    id: '4',
                    type: 'fact',
                    content: 'No embedding here',
                    createdAt: new Date().toISOString(),
                },
            ];

            const results = await strategy.retrieve('test', itemsWithoutEmbeddings, 10);

            // Should only return items with embeddings
            results.forEach((item) => {
                expect(item.embedding).toBeDefined();
            });
        });
    });
});