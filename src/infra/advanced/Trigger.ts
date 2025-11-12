// Automatically surface relevant memories without explicit queries

import {IStorageAdapter} from "../../domain/ports/IStorageAdapter";
import {MemoryItem} from "../../domain/models/MemoryItem";

export interface MemoryTrigger {
    id: string;
    pattern: string | RegExp;
    condition: (context: any) => boolean;
    action: 'recall' | 'suggest' | 'alert';
    priority: number;
}

export class ProactiveMemorySystem {
    private triggers: MemoryTrigger[] = [];

    constructor(private storage: IStorageAdapter) {}

    addTrigger(trigger: MemoryTrigger): void {
        this.triggers.push(trigger);
        this.triggers.sort((a, b) => b.priority - a.priority);
    }

    async checkTriggers(context: {
        currentInput?: string;
        location?: string;
        time?: string;
        recentActions?: string[];
    }): Promise<Array<{trigger: MemoryTrigger, memories: MemoryItem[]}>> {
        const activated = [];

        for (const trigger of this.triggers) {
            if (trigger.condition(context)) {
                const memories = await this.recallForTrigger(trigger, context);
                if (memories.length > 0) {
                    activated.push({ trigger, memories });
                }
            }
        }

        return activated;
    }

    private async recallForTrigger(
        trigger: MemoryTrigger,
        context: any
    ): Promise<MemoryItem[]> {
        const allMemories = await this.storage.getAll();

        return allMemories.filter(memory => {
            if (typeof trigger.pattern === 'string') {
                return memory.content.toLowerCase().includes(trigger.pattern.toLowerCase());
            } else {
                return trigger.pattern.test(memory.content);
            }
        });
    }

    // Example: Location-based triggers
    createLocationTrigger(location: string, radius: number = 1000): MemoryTrigger {
        return {
            id: `loc_${location}`,
            pattern: location,
            condition: (context) => {
                // Would check GPS distance in real implementation
                return context.location?.includes(location) || false;
            },
            action: 'suggest',
            priority: 5
        };
    }

    // Example: Time-based triggers
    createTimeTrigger(time: string): MemoryTrigger {
        return {
            id: `time_${time}`,
            pattern: time,
            condition: (context) => {
                const now = new Date();
                const hour = now.getHours();
                const targetHour = parseInt(time.split(':')[0]);
                return Math.abs(hour - targetHour) < 1;
            },
            action: 'recall',
            priority: 3
        };
    }
}