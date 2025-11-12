import {IEmbeddingAdapter} from "../../domain/ports/IEmbeddingAdapter";

export class MockEmbeddingAdapter implements IEmbeddingAdapter {
    private dimension: number;

    constructor(dimension: number = 1536) {
        this.dimension = dimension;
    }

    async embed(text: string): Promise<number[]> {
        // Generate deterministic mock embedding based on text
        const hash = this.simpleHash(text);
        return Array.from({ length: this.dimension }, (_, i) =>
            Math.sin(hash + i) * 0.5 + 0.5
        );
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        return Promise.all(texts.map((text) => this.embed(text)));
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash = hash & hash;
        }
        return hash;
    }
}