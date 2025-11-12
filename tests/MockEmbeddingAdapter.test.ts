import {MockEmbeddingAdapter} from "../src";

describe('MockEmbeddingAdapter', () => {
    let adapter: MockEmbeddingAdapter;

    beforeEach(() => {
        adapter = new MockEmbeddingAdapter(128);
    });

    describe('embed()', () => {
        it('should generate embedding of correct dimension', async () => {
            const embedding = await adapter.embed('test text');
            expect(embedding.length).toBe(128);
        });

        it('should generate deterministic embeddings', async () => {
            const embedding1 = await adapter.embed('same text');
            const embedding2 = await adapter.embed('same text');
            expect(embedding1).toEqual(embedding2);
        });

        it('should generate different embeddings for different texts', async () => {
            const embedding1 = await adapter.embed('text one');
            const embedding2 = await adapter.embed('text two');
            expect(embedding1).not.toEqual(embedding2);
        });

        it('should generate values between 0 and 1', async () => {
            const embedding = await adapter.embed('test');
            embedding.forEach((value) => {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('embedBatch()', () => {
        it('should generate embeddings for multiple texts', async () => {
            const texts = ['text one', 'text two', 'text three'];
            const embeddings = await adapter.embedBatch(texts);

            expect(embeddings.length).toBe(3);
            embeddings.forEach((embedding) => {
                expect(embedding.length).toBe(128);
            });
        });

        it('should maintain consistency with single embed', async () => {
            const text = 'test text';
            const singleEmbed = await adapter.embed(text);
            const batchEmbed = await adapter.embedBatch([text]);

            expect(batchEmbed[0]).toEqual(singleEmbed);
        });
    });
});