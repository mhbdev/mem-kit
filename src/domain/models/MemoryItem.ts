export type MemoryType = "fact" | "preference" | "event" | "summary" | "todo";

export interface MemoryItem {
    id: string;
    type: MemoryType;
    content: string;
    embedding?: number[];
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt?: string;
    relevance?: number;
    source?: string;
}

export interface MemoryItemInput {
    type: MemoryType;
    content: string;
    metadata?: Record<string, any>;
    source?: string;
}