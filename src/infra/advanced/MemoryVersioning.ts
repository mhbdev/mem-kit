// Track how memories evolve over time

export interface MemoryVersion {
    version: number;
    content: string;
    timestamp: string;
    changedBy?: string;
    changeReason?: string;
}

export class VersionedMemory {
    private versions: Map<string, MemoryVersion[]> = new Map();

    async updateMemory(
        memoryId: string,
        newContent: string,
        reason?: string
    ): Promise<void> {
        const versions = this.versions.get(memoryId) || [];

        versions.push({
            version: versions.length + 1,
            content: newContent,
            timestamp: new Date().toISOString(),
            changeReason: reason
        });

        this.versions.set(memoryId, versions);
    }

    getHistory(memoryId: string): MemoryVersion[] {
        return this.versions.get(memoryId) || [];
    }

    getAtTime(memoryId: string, timestamp: string): MemoryVersion | null {
        const versions = this.versions.get(memoryId) || [];

        // Find the last version before the given timestamp
        const targetTime = new Date(timestamp).getTime();

        for (let i = versions.length - 1; i >= 0; i--) {
            if (new Date(versions[i].timestamp).getTime() <= targetTime) {
                return versions[i];
            }
        }

        return null;
    }

    rollback(memoryId: string, toVersion: number): MemoryVersion | null {
        const versions = this.versions.get(memoryId);
        if (!versions || toVersion < 1 || toVersion > versions.length) {
            return null;
        }

        // Truncate versions after the target
        const newVersions = versions.slice(0, toVersion);
        this.versions.set(memoryId, newVersions);

        return newVersions[newVersions.length - 1];
    }
}
