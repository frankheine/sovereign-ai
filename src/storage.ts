// src/storage.ts
import localforage from 'localforage';

export interface ChatMessage {
    id: string;
    threadId: string;
    parentId: string | null;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface ChatThread {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

// 1. HOT TIER: IndexedDB for rapid, recent UI access
export const hotStore = localforage.createInstance({
    name: "SovereignRAG",
    storeName: "hot_cache"
});

export const threadsStore = localforage.createInstance({
    name: "SovereignRAG",
    storeName: "threads"
});

export const messagesStore = localforage.createInstance({
    name: "SovereignRAG",
    storeName: "messages"
});

export async function saveMessage(msg: ChatMessage) {
    await messagesStore.setItem(msg.id, msg);
}

export async function getThreadMessages(threadId: string): Promise<ChatMessage[]> {
    const msgs: ChatMessage[] = [];
    await messagesStore.iterate((value: ChatMessage) => {
        if (value.threadId === threadId) msgs.push(value);
    });
    return msgs.sort((a, b) => a.timestamp - b.timestamp);
}

// ============================================================================
// AUTONOMOUS MIGRATION (LRU & DECAY)
// ============================================================================
// Note: Warm storage (Vectors) is now handled by SQLite OPFS in db.worker.ts.
// This lifecycle manager cleans up the hot UI cache to prevent IndexedDB bloat.

export async function runDataLifecycleManager() {
    const DECAY_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days
    const now = Date.now();
    const keysToMigrate: string[] = [];

    await hotStore.iterate((value: any, key: string) => {
        if (value && value.lastAccessed && (now - value.lastAccessed > DECAY_THRESHOLD_MS)) {
            keysToMigrate.push(key);
        }
    });

    for (const key of keysToMigrate) {
        await hotStore.removeItem(key);
        console.log(`[Lifecycle Manager] Purged stale hot memory ${key}.`);
    }
}