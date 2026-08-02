import * as Comlink from 'comlink';

class NetworkWorker {
    async search(query: string): Promise<string[]> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch("https://lite.duckduckgo.com/lite/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `q=${encodeURIComponent(query)}`,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Search failed: ${response.status}`);

            const html = await response.text();
            const snippetRegex = /<td class='result-snippet'>([\s\S]*?)<\/td>/g;
            let match;
            const chunks: string[] = [];

            while ((match = snippetRegex.exec(html)) !== null) {
                const cleanText = match[1].replace(/<[^>]*>?/gm, '').trim();
                if (cleanText) chunks.push(cleanText);
            }

            return chunks;
        } catch (error) {
            console.error("[Network Worker] Search failed:", error);
            return [];
        }
    }
}

Comlink.expose(new NetworkWorker()); 0