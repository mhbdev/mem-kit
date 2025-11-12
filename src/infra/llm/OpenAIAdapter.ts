import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";

export interface OpenAILLMConfig {
    apiKey: string;
    model?: string;
    baseURL?: string;
}

export class OpenAIAdapter implements ILLMAdapter {
    private apiKey: string;
    private model: string;
    private baseURL: string;

    constructor(config: OpenAILLMConfig) {
        this.apiKey = config.apiKey;
        this.model = config.model || "gpt-4o-mini";
        this.baseURL = config.baseURL || "https://api.openai.com/v1";
    }

    async generate(prompt: string, options?: Record<string, any>): Promise<string> {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages: [{ role: "user", content: prompt }],
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens || 500,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        type OpenAIChatResponse = {
            choices: Array<{ message: { content: string } }>;
        };
        const data = (await response.json()) as OpenAIChatResponse;
        return data.choices[0].message.content;
    }
}
