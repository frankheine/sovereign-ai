// src/store.ts
import { create } from 'zustand';

interface SovereignState {
    targetModel: string;
    availableModels: string[];
    isBooting: boolean;
    engineReady: boolean;
    setEngineState: (booting: boolean, ready: boolean) => void;
    setModel: (modelId: string) => void;

    borderStyle: number;
    bgVariant: number;
    setUIPreferences: (border: number, bg: number) => void;

    encryptionKey: CryptoKey | null;
    setEncryptionKey: (key: CryptoKey) => void;
}

export const useSovereignStore = create<SovereignState>((set) => ({
    // Default to the Qwen 3 0.6B abliterated v2 (Huihui)
    targetModel: '/models/gguf/Huihui-Qwen3-0.6B-abliterated-v2.Q4_K_M.gguf',

    // The complete roster of available GGUF models
    availableModels: [
        '/models/gguf/Huihui-Qwen3-0.6B-abliterated-v2.Q4_K_M.gguf',
        '/models/gguf/Qwen3.5-0.8B_Abliterated.i1-Q4_K_M.gguf',
        '/models/gguf/Huihui-Qwen3.5-0.8B-abliterated-Athanorlite-ORPO.i1-Q4_K_M.gguf',
        '/models/gguf/Qwen3-0.6B-heretic-abliterated-uncensored_Q4_k_m.gguf',
        '/models/gguf/qwen3-0.6b-Q4_K_M.gguf',
        '/models/gguf/Atomight-V2.2-UltraThink-0.5B-abliterated.i1-Q4_K_M.gguf',
        '/models/gguf/qwenpus0.6B-Q4_K_M.gguf'
    ],

    isBooting: false,
    engineReady: false,
    setEngineState: (isBooting, engineReady) => set({ isBooting, engineReady }),
    setModel: (targetModel) => set({ targetModel }),

    borderStyle: 2,
    bgVariant: 2,
    setUIPreferences: (borderStyle, bgVariant) => set({ borderStyle, bgVariant }),

    encryptionKey: null,
    setEncryptionKey: (encryptionKey) => set({ encryptionKey }),
}));