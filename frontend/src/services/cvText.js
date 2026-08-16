// CV text extraction - pulls readable text out of an uploaded CV file so the
// AI agent can build on it instead of asking the user to repeat themselves.
// Supports PDF (pdfjs-dist) and DOCX/DOC (mammoth). Returns '' if the file
// type is unsupported or the extraction fails - and it can NEVER hang: every
// extraction is raced against a timeout so the conversation never blocks.
// The agent then falls back to the normal question flow.

const EXTRACT_TIMEOUT_MS = 15000;

// Promise.race wrapper: if the extraction takes longer than the timeout, we
// resolve with '' instead of blocking forever (pdfjs worker loading can stall
// in some builds - never let that freeze the whole conversation).
const withTimeout = (promise, ms) =>
    Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve(''), ms)),
    ]);

export const extractCVText = async (file) => {
    if (!file) return '';
    const name = String(file.name || '').toLowerCase();

    try {
        if (name.endsWith('.pdf')) {
            const pdfjs = await import('pdfjs-dist');
            // Worker setup for the browser build (create-react-app friendly).
            try {
                pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
            } catch {
                // If the worker URL can't be resolved, fall back to fetching it
                // from the CDN - extraction must not hang on this.
                pdfjs.GlobalWorkerOptions.workerSrc =
                    'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs';
            }
            const buf = await file.arrayBuffer();
            const doc = await withTimeout(pdfjs.getDocument({ data: buf }).promise, EXTRACT_TIMEOUT_MS);
            if (!doc || !doc.numPages) return '';
            let text = '';
            for (let i = 1; i <= doc.numPages; i += 1) {
                const page = await withTimeout(doc.getPage(i), EXTRACT_TIMEOUT_MS);
                if (!page) return text.trim();
                const content = await withTimeout(page.getTextContent(), EXTRACT_TIMEOUT_MS);
                if (content?.items) {
                    text += content.items.map((it) => it.str || '').join(' ') + '\n';
                }
            }
            try { await doc.destroy(); } catch { /* ignore */ }
            return text.trim();
        }

        if (name.endsWith('.docx') || name.endsWith('.doc')) {
            const mammoth = await import('mammoth/mammoth.browser');
            const buf = await file.arrayBuffer();
            const result = await withTimeout(mammoth.extractRawText({ arrayBuffer: buf }), EXTRACT_TIMEOUT_MS);
            return String(result?.value || '').trim();
        }

        if (name.endsWith('.txt')) {
            return String(await file.text()).trim();
        }
    } catch (err) {
        // Extraction failed - fall through to '' so the flow is never blocked.
        console.error('CV text extraction failed:', err);
    }

    return '';
};
