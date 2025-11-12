import {IEmbeddingAdapter} from "../../domain/ports/IEmbeddingAdapter";

export interface OpenAIEmbeddingConfig {
    apiKey: string;
    model?: string;
    baseURL?: string;
}

export class OpenAIEmbeddingAdapter implements IEmbeddingAdapter {
    private apiKey: string;
    private model: string;
    private baseURL: string;

    constructor(config: OpenAIEmbeddingConfig) {
        this.apiKey = config.apiKey;
        this.model = config.model || "text-embedding-3-small";
        this.baseURL = config.baseURL || "https://api.openai.com/v1";
    }

    async embed(text: string): Promise<number[]> {
        const response = await fetch(`${this.baseURL}/embeddings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                input: text,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        type OpenAIEmbeddingResponse = { data: Array<{ embedding: number[] }> };
        const data = (await response.json()) as OpenAIEmbeddingResponse;
        return data.data[0].embedding;
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        const response = await fetch(`${this.baseURL}/embeddings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                input: texts,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        type OpenAIEmbeddingResponse = { data: Array<{ embedding: number[] }> };
        const data = (await response.json()) as OpenAIEmbeddingResponse;
        return data.data.map((item) => item.embedding);
    }
}
