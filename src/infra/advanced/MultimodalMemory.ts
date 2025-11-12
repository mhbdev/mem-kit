// Not just text - remember images, voices, videos

import {MemoryItem} from "../../domain/models/MemoryItem";

export interface MultiModalMemory extends MemoryItem {
    modality: 'text' | 'image' | 'audio' | 'video';
    data?: {
        url?: string;
        base64?: string;
        transcript?: string;
        imageDescription?: string;
        duration?: number;
    };
}

export class MultiModalMemoryAdapter {
    constructor(
        private imageDescriptor: IImageDescriptor,
        private audioTranscriber: IAudioTranscriber
    ) {}

    async processImage(imageUrl: string): Promise<MultiModalMemory> {
        const description = await this.imageDescriptor.describe(imageUrl);
        const embedding = await this.generateEmbedding(description);

        return {
            id: `img_${Date.now()}`,
            type: 'event',
            modality: 'image',
            content: description,
            embedding,
            data: {
                url: imageUrl,
                imageDescription: description
            },
            createdAt: new Date().toISOString()
        };
    }

    async processAudio(audioUrl: string): Promise<MultiModalMemory> {
        const transcript = await this.audioTranscriber.transcribe(audioUrl);
        const embedding = await this.generateEmbedding(transcript);

        return {
            id: `audio_${Date.now()}`,
            type: 'event',
            modality: 'audio',
            content: transcript,
            embedding,
            data: {
                url: audioUrl,
                transcript
            },
            createdAt: new Date().toISOString()
        };
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        // Simple deterministic embedding from text: char-code hashing
        const vecSize = 16;
        const vec = new Array<number>(vecSize).fill(0);
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            vec[i % vecSize] += code;
        }
        // Normalize
        const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
        return vec.map(v => v / norm);
    }
}

interface IImageDescriptor {
    describe(imageUrl: string): Promise<string>;
}

interface IAudioTranscriber {
    transcribe(audioUrl: string): Promise<string>;
}