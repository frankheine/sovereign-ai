// src/rag/pipeline.ts
import { dbWorker, embedWorker, rerankWorker, networkWorker, inferenceWorker, killMemoryWorkers } from '../workers/worker-client';

export const getWorkers = {
    getEmbed: () => embedWorker,
    getRetrieve: () => dbWorker,
    getRerank: () => rerankWorker,
    getNetwork: () => networkWorker,
    getInference: () => inferenceWorker,
    killMemoryWorkers: () => killMemoryWorkers()
};

export async function runWorker<T>(type: string, payload: any, onProgress?: any): Promise<T> {
    if (type === 'embed') {
        const embedding = await embedWorker.embed(payload.text);
        return { embedding } as unknown as T;
    }
    if (type === 'retrieve') {
        if (payload.action === 'insert') {
            await dbWorker.insertChunk(payload.text, payload.embedding, payload.metadata || {});
            return { status: 'success' } as unknown as T;
        }
        if (payload.action === 'search') {
            const candidates = await dbWorker.hybridSearch(payload.queryText, payload.queryVector, 10);
            return { candidates } as unknown as T;
        }
    }
    if (type === 'rerank') {
        const reranked = await rerankWorker.rerank(payload.query, payload.candidates);
        return { reranked } as unknown as T;
    }
    if (type === 'inference') {
        const text = await inferenceWorker.generate(payload.prompt, payload.context, payload.systemPrompt, onProgress);
        return { text } as unknown as T;
    }
    throw new Error(`Unknown worker type in bridge: ${type}`);
}

export async function bootstrapSovereignEngine(targetModel: string, progressCallback: (text: string) => void) {
    progressCallback("Bootstrapping Native Bridge...");
    await new Promise(r => setTimeout(r, 1000));
    progressCallback("Engine Ready.");
    return true;
}