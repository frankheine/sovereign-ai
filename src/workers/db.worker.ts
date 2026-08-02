// src/workers/db.worker.ts
import * as Comlink from 'comlink';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

class DatabaseWorker {
    private db: any = null;
    private isReady = false;

    async init() {
        if (this.isReady) return;
        try {
            // 1. Initialize SQLite WASM (without passing options directly)
            const sqlite3 = await sqlite3InitModule();

            // 2. Safely check for OPFS support
            if ('opfs' in sqlite3) {
                this.db = new (sqlite3.oo1 as any).OpfsDb('/sovereign-vault.sqlite3');
            } else {
                this.db = new sqlite3.oo1.DB('/transient.sqlite3', 'ct');
            }

            // Initialize FTS5 (Lexical) and vec0 (Semantic) tables
            // Note: all-MiniLM-L6-v2 outputs 384-dimensional vectors
            this.db.exec(`
                CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(text, content='');
                CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(vector float[384]);
                CREATE TABLE IF NOT EXISTS embeddings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT,
                    metadata TEXT
                );
            `);

            this.isReady = true;
        } catch (error) {
            console.error("[DB Worker] Failed to initialize SQLite WASM:", error);
            throw error;
        }
    }

    async insertChunk(text: string, embedding: number[], metadata: any = {}) {
        if (!this.isReady) await this.init();

        const floatArray = new Float32Array(embedding);
        const buffer = new Uint8Array(floatArray.buffer);

        this.db.exec('BEGIN TRANSACTION;');
        try {
            this.db.exec({
                sql: `INSERT INTO embeddings (text, metadata) VALUES (?, ?)`,
                bind: [text, JSON.stringify(metadata)]
            });

            this.db.exec({
                sql: `INSERT INTO chunks_fts (rowid, text) VALUES (last_insert_rowid(), ?)`,
                bind: [text]
            });

            this.db.exec({
                sql: `INSERT INTO vec_chunks (rowid, vector) VALUES (last_insert_rowid(), ?)`,
                bind: [buffer]
            });
            this.db.exec('COMMIT;');
        } catch (e) {
            this.db.exec('ROLLBACK;');
            throw e;
        }
    }

    async hybridSearch(queryText: string, queryVector: number[], limit: number = 30) {
        if (!this.isReady) await this.init();

        const floatArray = new Float32Array(queryVector);
        const buffer = new Uint8Array(floatArray.buffer);
        const results: any[] = [];

        // Hybrid Search: Combines FTS5 BM25 rank with sqlite-vec cosine distance
        this.db.exec({
            sql: `
                WITH semantic_matches AS (
                    SELECT rowid, distance 
                    FROM vec_chunks 
                    WHERE vector MATCH ? AND k = ?
                ),
                lexical_matches AS (
                    SELECT rowid, rank 
                    FROM chunks_fts 
                    WHERE chunks_fts MATCH ?
                )
                SELECT 
                    e.rowid, 
                    e.text, 
                    s.distance,
                    l.rank
                FROM embeddings e
                LEFT JOIN semantic_matches s ON e.rowid = s.rowid
                LEFT JOIN lexical_matches l ON e.rowid = l.rowid
                WHERE s.rowid IS NOT NULL OR l.rowid IS NOT NULL
                ORDER BY (COALESCE(s.distance, 1.0) * 0.7) + (COALESCE(l.rank, 10.0) * 0.3) ASC
                LIMIT ?
            `,
            bind: [buffer, limit * 2, queryText.replace(/[^a-zA-Z0-9 ]/g, '*'), limit],
            callback: (row: any) => {
                results.push({ id: row[0], text: row[1], distance: row[2], rank: row[3] });
            }
        });
        return results;
    }
}

Comlink.expose(new DatabaseWorker());