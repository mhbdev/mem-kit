// Maintain conversation threads and turn-taking

import {ILLMAdapter} from "../../domain/ports/ILLMAdapter";
import {IStorageAdapter} from "../../domain/ports/IStorageAdapter";

export interface ConversationTurn {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

export interface Conversation {
    id: string;
    participants: string[];
    turns: ConversationTurn[];
    summary?: string;
    topics: string[];
    startedAt: string;
    lastActivity: string;
}

export class ConversationMemory {
    private conversations: Map<string, Conversation> = new Map();

    constructor(
        private llm: ILLMAdapter,
        private storage: IStorageAdapter
    ) {}

    async startConversation(participants: string[]): Promise<string> {
        const id = `conv_${Date.now()}`;
        const conversation: Conversation = {
            id,
            participants,
            turns: [],
            topics: [],
            startedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        this.conversations.set(id, conversation);
        return id;
    }

    async addTurn(
        conversationId: string,
        role: 'user' | 'assistant',
        content: string
    ): Promise<void> {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) throw new Error('Conversation not found');

        conversation.turns.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });

        conversation.lastActivity = new Date().toISOString();

        // Extract topics periodically
        if (conversation.turns.length % 10 === 0) {
            await this.updateTopics(conversation);
        }
    }

    private async updateTopics(conversation: Conversation): Promise<void> {
        const recentTurns = conversation.turns.slice(-10);
        const context = recentTurns.map(t => `${t.role}: ${t.content}`).join('\n');

        const prompt = `From this conversation, extract 3-5 main topics being discussed:

${context}

Return as JSON array: ["topic1", "topic2", ...]`;

        const response = await this.llm.generate(prompt);
        const topics = JSON.parse(response);

        conversation.topics = [...new Set([...conversation.topics, ...topics])];
    }

    async getConversationContext(
        conversationId: string,
        maxTurns: number = 10
    ): Promise<ConversationTurn[]> {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) return [];

        return conversation.turns.slice(-maxTurns);
    }

    async summarizeConversation(conversationId: string): Promise<string> {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) throw new Error('Conversation not found');

        const context = conversation.turns
            .map(t => `${t.role}: ${t.content}`)
            .join('\n');

        const prompt = `Summarize this conversation concisely:

${context}

Focus on key points, decisions, and action items.`;

        const summary = await this.llm.generate(prompt);
        conversation.summary = summary;

        // Store as memory
        await this.storage.save({
            id: `summary_${conversationId}`,
            type: 'summary',
            content: summary,
            createdAt: new Date().toISOString(),
            metadata: {
                conversationId,
                topics: conversation.topics,
                turnCount: conversation.turns.length
            }
        });

        return summary;
    }
}