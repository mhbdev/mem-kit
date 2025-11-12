import {InMemoryStorageAdapter, MemoryItem} from "../src";

describe('InMemoryStorageAdapter', () => {
    let adapter: InMemoryStorageAdapter;
    let mockItem: MemoryItem;

    beforeEach(() => {
        adapter = new InMemoryStorageAdapter();
        mockItem = {
            id: 'test-id',
            type: 'fact',
            content: 'Test content',
            createdAt: new Date().toISOString(),
        };
    });

    describe('save()', () => {
        it('should save memory item', async () => {
            await adapter.save(mockItem);
            const retrieved = await adapter.get(mockItem.id);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe(mockItem.id);
        });

        it('should update existing item', async () => {
            await adapter.save(mockItem);
            const updated = { ...mockItem, content: 'Updated content' };
            await adapter.save(updated);

            const retrieved = await adapter.get(mockItem.id);
            expect(retrieved!.content).toBe('Updated content');
        });
    });

    describe('get()', () => {
        it('should retrieve existing item', async () => {
            await adapter.save(mockItem);
            const retrieved = await adapter.get(mockItem.id);

            expect(retrieved).toEqual(mockItem);
        });

        it('should return null for non-existent item', async () => {
            const retrieved = await adapter.get('non-existent');
            expect(retrieved).toBeNull();
        });
    });

    describe('getAll()', () => {
        it('should return all items', async () => {
            const item1 = { ...mockItem, id: 'id-1' };
            const item2 = { ...mockItem, id: 'id-2' };

            await adapter.save(item1);
            await adapter.save(item2);

            const all = await adapter.getAll();
            expect(all.length).toBe(2);
        });

        it('should return empty array when no items exist', async () => {
            const all = await adapter.getAll();
            expect(all).toEqual([]);
        });
    });

    describe('delete()', () => {
        it('should delete existing item', async () => {
            await adapter.save(mockItem);
            const deleted = await adapter.delete(mockItem.id);

            expect(deleted).toBe(true);
            const retrieved = await adapter.get(mockItem.id);
            expect(retrieved).toBeNull();
        });

        it('should return false for non-existent item', async () => {
            const deleted = await adapter.delete('non-existent');
            expect(deleted).toBe(false);
        });
    });

    describe('clear()', () => {
        it('should remove all items', async () => {
            await adapter.save({ ...mockItem, id: 'id-1' });
            await adapter.save({ ...mockItem, id: 'id-2' });

            await adapter.clear();

            const all = await adapter.getAll();
            expect(all).toEqual([]);
        });
    });
});