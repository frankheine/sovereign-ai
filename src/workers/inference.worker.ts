// src/workers/inference.worker.ts
import * as Comlink from 'comlink';
import { Wllama } from '@wllama/wllama';

class InferenceWorker {
    private isInitialized = false;
    private modelPath = "";
    private wllama: Wllama | null = null;

    async init(modelPath: string) {
        // If already initialized with the SAME model, do nothing.
        if (this.isInitialized && this.modelPath === modelPath) return;

        console.log(`[Inference Worker] Booting wllama (WASM/WebGPU) for: ${modelPath}`);

        // If hot-swapping models, we MUST release the old model from RAM first.
        if (this.isInitialized && this.wllama) {
            console.log("[Inference Worker] Purging previous model from memory...");
            await this.wllama.exit();
            this.wllama = null;
        }

        this.modelPath = modelPath;

        // Initialize Wllama with the unified v3.1+ WASM binary
        this.wllama = new Wllama({
            default: '/wllama/wllama.wasm'
        });

        // Load Model with strict memory constraints
        // wllama natively caches to OPFS to bypass the 1.8GB iOS RAM limit
        const root = await navigator.storage.getDirectory();
        const modelName = this.modelPath.split('/').pop() || 'model.gguf';
        const fileHandle = await root.getFileHandle(modelName);
        const file = await fileHandle.getFile();

        // FIX: Wrap the OPFS File object in an array to satisfy the Blob[] signature
        await this.wllama.loadModel([file], {
            n_ctx: 2048, // Strictly finite context window (The Desk)
        });

        this.isInitialized = true;
        console.log("[Inference Worker] wllama Initialized. GGUF Model Cached in OPFS.");
    }

    async generate(prompt: string, context: string, systemPrompt: string, onProgress: (msg: any) => void): Promise<string> {
        if (!this.isInitialized || !this.wllama) throw new Error("Inference worker not initialized.");

        // Format prompt using Qwen2.5 ChatML syntax (works for DeepSeek-R1-Distill-Qwen as well)
        const fullPrompt = `<|im_start|>system\n${systemPrompt}\n\nContext:\n${context}<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`;

        let generatedText = "";

        try {
            // Execute WASM inference using wllama v3 API (OpenAI Compatible)
            const stream = await this.wllama.createCompletion({
                prompt: fullPrompt,
                max_tokens: 2048,
                temperature: 0.3, // Low temperature for RAG precision
                top_p: 0.9,
                stream: true
            });

            // Iterate over the async generator returned by stream: true
            for await (const chunk of stream) {
                const tokenStr = chunk.choices[0]?.text || "";
                onProgress({ delta: tokenStr });
                generatedText += tokenStr;
            }
        } catch (error: any) {
            console.error("[Inference Worker] wllama generation failed:", error);
            throw error;
        }

        return generatedText.trim();
    }
}

Comlink.expose(new InferenceWorker());