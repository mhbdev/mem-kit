import {MemoryItem} from "../models/MemoryItem";

export interface IRetrievalStrategy {
    retrieve(
        query: string,
        items: MemoryItem[],
        limit?: number
    ): Promise<MemoryItem[]>;
}