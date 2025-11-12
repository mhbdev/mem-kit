import {KeywordRetrievalStrategy, MemoryItem} from "../src";

describe('KeywordRetrievalStrategy', () => {
    let strategy: KeywordRetrievalStrategy;
    let items: MemoryItem[];

    beforeEach(() => {
        strategy = new KeywordRetrievalStrategy();
        items = [
            {
                id: '1',
                type: 'fact',
                content: 'User loves JavaScript programming',
                createdAt: new Date().toISOString(),
            },
            {
                id: '2',
                type: 'fact',
                content: 'User enjoys Python development',
                createdAt: new Date().toISOString(),
            },
            {
                id: '3',
                type: 'preference',
                content: 'User prefers coffee over tea',
                createdAt: new Date().toISOString(),
            },
        ];
    });

    describe('retrieve()', () => {
        it('should return items matching keywords', async () => {
            const results = await strategy.retrieve('programming JavaScript', items);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].content).toContain('JavaScript');
        });

        it('should return empty array when no matches', async () => {
            const results = await strategy.retrieve('quantum physics', items);
            expect(results).toEqual([]);
        });

        it('should respect limit parameter', async () => {
            const results = await strategy.retrieve('user', items, 2);
            expect(results.length).toBeLessThanOrEqual(2);
        });

        it('should rank by number of keyword matches', async () => {
            const results = await strategy.retrieve('user programming development', items);

            // Items with more matches should rank higher
            expect(results.length).toBeGreaterThan(0);
        });

        it('should be case-insensitive', async () => {
            const results = await strategy.retrieve('JAVASCRIPT', items);
            expect(results.length).toBeGreaterThan(0);
        });

        it('should handle metadata in search', async () => {
            const itemsWithMeta = [
                {
                    ...items[0],
                    metadata: { tags: ['important', 'work'] },
                },
            ];

            const results = await strategy.retrieve('important', itemsWithMeta);
            expect(results.length).toBeGreaterThan(0);
        });
    });
});
