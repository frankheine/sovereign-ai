// src/rag/ingestion.ts
import { inferenceWorker } from "../workers/worker-client";
import * as Comlink from 'comlink';

export interface TextChunk {
    id: string;
    text: string;
    metadata: any;
}

let lastKnownState: Record<string, any> = {};

export function deltaBasedLogFilter(incomingState: Record<string, any>, threshold: number = 0.05): boolean {
    let hasSignificantChange = false;

    for (const key in incomingState) {
        if (typeof incomingState[key] === 'number' && typeof lastKnownState[key] === 'number') {
            const diff = Math.abs(incomingState[key] - lastKnownState[key]);
            if (diff > threshold) hasSignificantChange = true;
        } else if (incomingState[key] !== lastKnownState[key]) {
            hasSignificantChange = true;
        }
    }

    if (hasSignificantChange) {
        lastKnownState = { ...lastKnownState, ...incomingState };
        return true;
    }
    return false;
}

export async function contextualChunkingPipeline(
    rawText: string,
    baseMetadata: any,
    chunkSize: number = 500,
    chunkOverlap: number = 50
): Promise<TextChunk[]> {
    const chunks: TextChunk[] = [];
    const separators = ['\n\n', '\n', '. ', ' '];

    let currentChunks: string[] = [];
    let startIndex = 0;

    while (startIndex < rawText.length) {
        let endIndex = startIndex + chunkSize;
        if (endIndex < rawText.length) {
            let bestSplit = endIndex;
            for (const sep of separators) {
                const splitIdx = rawText.lastIndexOf(sep, endIndex);
                if (splitIdx > startIndex + (chunkSize / 2)) {
                    bestSplit = splitIdx + sep.length;
                    break;
                }
            }
            endIndex = bestSplit;
        }
        currentChunks.push(rawText.slice(startIndex, endIndex).trim());
        startIndex = endIndex - chunkOverlap;
    }

    for (let i = 0; i < currentChunks.length; i++) {
        const chunkText = currentChunks[i];
        if (chunkText.length < 10) continue;

        try {
            const prompt = `Provide a 1-sentence context summary for the following text snippet to aid in vector retrieval:\n\nSnippet: "${chunkText}"\n\nContext:`;

            // Create a dummy progress callback for the Comlink proxy
            const dummyProgress = Comlink.proxy((msg: any) => { });

            const responseText = await inferenceWorker.generate(
                prompt,
                "",
                "You are a data ingestion agent. Output ONLY a single sentence summarizing the context.",
                dummyProgress
            );

            (dummyProgress as any)[Comlink.releaseProxy]();

            const contextualizedText = `[Context: ${responseText.trim()}]\n${chunkText}`;

            chunks.push({
                id: crypto.randomUUID(),
                text: contextualizedText,
                metadata: {
                    ...baseMetadata,
                    chunkIndex: i,
                    totalChunks: currentChunks.length
                }
            });
        } catch (e) {
            console.warn("[Ingestion] Contextual tagging failed, falling back to raw chunk.", e);
            chunks.push({
                id: crypto.randomUUID(),
                text: chunkText,
                metadata: { ...baseMetadata, chunkIndex: i }
            });
        }
    }

    return chunks;
}