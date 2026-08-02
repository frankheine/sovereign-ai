// src/rag/bloom.cache.ts
import { BloomFilter } from 'bloom-filters';

// Bloom Filter Configuration:
// Capacity: 1,000,000 items
// False Positive Rate: 1% (0.01)
// Bounds memory usage to ~1.20 MB while allowing near-instant O(1) cache lookups
export const bloomCache = new BloomFilter(1000000, 0.01);

export function mightHavePrompt(promptHash: string): boolean {
    return bloomCache.has(promptHash);
}

export function addPromptToCache(promptHash: string): void {
    bloomCache.add(promptHash);
}

export function exportBloomState() {
    return bloomCache.saveAsJSON();
}

export function importBloomState(jsonState: any) {
    return BloomFilter.fromJSON(jsonState);
}