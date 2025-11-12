export interface ILLMAdapter {
    generate(prompt: string, options?: Record<string, any>): Promise<string>;
}