import {IStorageAdapter} from "../../domain/ports/IStorageAdapter";
import {IEmbeddingAdapter} from "../../domain/ports/IEmbeddingAdapter";
import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";
import {IRetrievalStrategy} from "../../domain/ports/IRetrievalStrategy";
import {ITimeProvider} from "../../domain/ports/ITimeProvider";
import {ILogger} from "../../domain/ports/ILogger";

export interface MemoryConfig {
    storage: IStorageAdapter;
    embedder?: IEmbeddingAdapter;
    llm?: ILLMAdapter;
    retrieval?: IRetrievalStrategy;
    timeProvider?: ITimeProvider;
    logger?: ILogger;
    options?: {
        autoEmbed?: boolean;
        defaultRetrievalLimit?: number;
        enableDecay?: boolean;
        decayFactor?: number;
    };
}