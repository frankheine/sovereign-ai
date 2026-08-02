// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'tw-shimmer'
import './index.css'
import App from './App.tsx'

async function ensurePersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`[STORAGE] Persistent Storage Permissions Granted: ${isPersisted}`);
    }
}

// Tie persistence to the first user interaction to satisfy browser requirements
// This guarantees the 400MB GGUF model is not evicted by Safari
const handleFirstInteraction = () => {
    ensurePersistentStorage();
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
};

document.addEventListener('click', handleFirstInteraction);
document.addEventListener('keydown', handleFirstInteraction);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)