// GDPR-compliant memory management

import {MemoryItem} from "../../domain/models/MemoryItem";

export interface ForgetPolicy {
    shouldForget(memory: MemoryItem): boolean;
    sanitize?(memory: MemoryItem): MemoryItem;
}

export class GDPRForgetPolicy implements ForgetPolicy {
    constructor(private sensitivePatterns: RegExp[]) {}

    shouldForget(memory: MemoryItem): boolean {
        // Check if memory contains sensitive data
        for (const pattern of this.sensitivePatterns) {
            if (pattern.test(memory.content)) {
                return true;
            }
        }

        // Auto-forget after retention period
        const age = Date.now() - new Date(memory.createdAt).getTime();
        const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days

        return age > maxAge;
    }

    sanitize(memory: MemoryItem): MemoryItem {
        let content = memory.content;

        // Remove PII patterns
        content = content.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
        content = content.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL]');
        content = content.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');

        return {
            ...memory,
            content,
            metadata: {
                ...memory.metadata,
                sanitized: true
            }
        };
    }
}