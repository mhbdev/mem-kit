import {MemoryItem} from "../models/MemoryItem";

export interface IStorageAdapter {
  save(item: MemoryItem): Promise<void>;
  get(id: string): Promise<MemoryItem | null>;
  getAll(): Promise<MemoryItem[]>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
}