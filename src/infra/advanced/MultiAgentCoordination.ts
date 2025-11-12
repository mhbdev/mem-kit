// Share memories across multiple AI agents

import {MemoryItem} from "../../domain/models/MemoryItem";

export interface AgentMemorySpace {
    agentId: string;
    personalMemories: MemoryItem[];
    sharedMemories: string[]; // IDs of shared memories
    permissions: {
        canRead: string[];
        canWrite: string[];
    };
}

export class FederatedMemorySystem {
    private agents: Map<string, AgentMemorySpace> = new Map();
    private sharedPool: Map<string, MemoryItem> = new Map();

    registerAgent(agentId: string, permissions?: AgentMemorySpace['permissions']): void {
        this.agents.set(agentId, {
            agentId,
            personalMemories: [],
            sharedMemories: [],
            permissions: permissions || { canRead: [], canWrite: [] }
        });
    }

    async shareMemory(
        fromAgent: string,
        memory: MemoryItem,
        toAgents: string[]
    ): Promise<void> {
        this.sharedPool.set(memory.id, memory);

        for (const agentId of toAgents) {
            const agent = this.agents.get(agentId);
            if (agent && this.canAccess(fromAgent, agentId, 'write')) {
                agent.sharedMemories.push(memory.id);
            }
        }
    }

    async getMemoryForAgent(agentId: string): Promise<MemoryItem[]> {
        const agent = this.agents.get(agentId);
        if (!agent) return [];

        const memories = [...agent.personalMemories];

        for (const memId of agent.sharedMemories) {
            const shared = this.sharedPool.get(memId);
            if (shared) memories.push(shared);
        }

        return memories;
    }

    private canAccess(fromAgent: string, toAgent: string, access: 'read' | 'write'): boolean {
        const agent = this.agents.get(toAgent);
        if (!agent) return false;

        const list = access === 'read' ? agent.permissions.canRead : agent.permissions.canWrite;
        return list.includes(fromAgent) || list.includes('*');
    }

    async synchronize(agents: string[]): Promise<void> {
        // Merge memories from multiple agents
        const allMemories = new Map<string, MemoryItem>();

        for (const agentId of agents) {
            const memories = await this.getMemoryForAgent(agentId);
            for (const mem of memories) {
                if (!allMemories.has(mem.id)) {
                    allMemories.set(mem.id, mem);
                }
            }
        }

        // Share everything with all agents
        for (const [memId, memory] of allMemories) {
            this.sharedPool.set(memId, memory);
            for (const agentId of agents) {
                const agent = this.agents.get(agentId);
                if (agent && !agent.sharedMemories.includes(memId)) {
                    agent.sharedMemories.push(memId);
                }
            }
        }
    }
}