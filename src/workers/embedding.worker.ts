// src/workers/embedding.worker.ts
import * as Comlink from 'comlink';
import { pipeline, env } from '@huggingface/transformers';

// CRITICAL UPDATE: Enforce strict air-gapped execution. 
// If the ONNX files are missing from public/models/, it will fail rather than phoning home.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/models/';
env.useBrowserCache = false;

// Explicitly map the files so ONNX never requests the missing .jsep.wasm file
// FIX: Cast to 'any' to bypass TS2353 type definition mismatches in Transformers.js
env.backends.onnx.wasm!.wasmPaths = {
    'wasm': self.location.origin + '/wasm/ort-wasm.wasm',
    'ort-wasm-simd.wasm': self.location.origin + '/wasm/ort-wasm-simd.wasm',
    'ort-wasm-threaded.wasm': self.location.origin + '/wasm/ort-wasm-threaded.wasm',
    'ort-wasm-simd-threaded.wasm': self.location.origin + '/wasm/ort-wasm-simd-threaded.wasm',
    'ort-wasm-simd-threaded.jsep.mjs': self.location.origin + '/wasm/ort-wasm-simd-threaded.jsep.mjs',
    'ort-wasm-simd-threaded.jsep.wasm': self.location.origin + '/wasm/ort-wasm-simd-threaded.jsep.wasm'
} as any;

// UNLEASH MULTI-THREADING & SIMD
const availableCores = navigator.hardwareConcurrency || 4;
env.backends.onnx.wasm!.numThreads = Math.max(1, availableCores - 1);
env.backends.onnx.wasm!.simd = true;
env.backends.onnx.wasm!.proxy = false;

class EmbeddingWorker {
    private extractor: any = null;
    private initPromise: Promise<any> | null = null;

    async init(onProgress?: (msg: any) => void) {
        if (!this.extractor) {
            if (!this.initPromise) {
                if (onProgress) onProgress({ status: 'progress', log: '🧬 Initializing embedding model...' });

                this.initPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                    device: 'wasm',
                    quantized: true,
                    progress_callback: (data: any) => {
                        if (!onProgress) return;
                        if (data.status === 'progress' && typeof data.progress === 'number') {
                            onProgress({ status: 'progress', log: `Loading Embedding Weights: ${Math.round(data.progress)}%` });
                        } else {
                            onProgress({ status: 'progress', log: `Loading Embedding Weights: ${data.status || 'Downloading'}...` });
                        }
                    }
                } as any);
            }
            this.extractor = await this.initPromise;
            if (onProgress) onProgress({ status: 'progress', log: '✅ Embedding model ready.' });
        }
    }

    async embed(text: string, onProgress?: (msg: any) => void): Promise<number[]> {
        if (!this.extractor) await this.init(onProgress);

        if (!text) return []; // Handle empty wakeup calls gracefully

        if (onProgress) onProgress({ status: 'progress', log: '🔢 Running inference...' });

        const output = await this.extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }
}

Comlink.expose(new EmbeddingWorker());