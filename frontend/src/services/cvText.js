// CV text extraction - pulls readable text out of an uploaded CV file so the
// AI agent can build on it instead of asking the user to repeat themselves.
// Supports PDF (pdfjs-dist) and DOCX/DOC (mammoth). Returns '' if the file
// type is unsupported or the extraction fails - and it can NEVER hang: every
// extraction is raced against a timeout so the conversation never blocks.
// The agent then falls back to the normal question flow.
//
// CRITICAL (2026-08-16): the webpack-emitted pdfjs WORKER is broken in the
// CRA production build. Terser mangles the ESM worker's private class fields,
// so loading it throws "Private field '#T' must be declared in an enclosing
// class" -> pdfjs falls back to the fake worker -> which also throws -> the
// getDocument promise never resolves. That made PDF CVs "endlessly upload"
// and left cvText empty so the agent never saw the CV. FIX: always point
// GlobalWorkerOptions.workerSrc at the pinned jsDelivr CDN worker (verified
// working) instead of the bundled one.

const EXTRACT_TIMEOUT_MS = 15000;

// Pinned CDN copy of the pdfjs WORKER (same version as the installed lib).
// We MUST use this instead of the webpack-emitted worker: Terser mangles the
// ESM worker's private class fields in the CRA production build, so the
// bundled worker throws "Private field '#T' must be declared in an enclosing
// class" and extraction hangs. The CDN worker is served un-processed and is
// verified working. (It is a plain string assignment - not an import - so it
// never triggers a webpack build warning.)
const PDF_WORKER_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs';

// Promise.race wrapper: if the extraction takes longer than the timeout, we
// resolve with '' instead of blocking forever (pdfjs worker init can stall in
// some builds - never let that freeze the whole conversation).
const withTimeout = (promise, ms) =>
    Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve(''), ms)),
    ]);

// Load the pdfjs library. We PREFER the pinned CDN copy: it is served
// un-processed (no webpack/Terser mangling) and is the exact lib + worker
// combo verified working end-to-end in a real browser. The bundled copy is
// only a fallback if the CDN is unreachable.
// `webpackIgnore` makes webpack leave this import as a native runtime
// import() instead of trying to resolve/bundle the URL - so it does NOT
// trigger the "Critical dependency" warning that fails CI builds.
const loadPdfJs = async () => {
    try {
        return await import(/* webpackIgnore: true */ 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.min.mjs');
    } catch {
        return await import('pdfjs-dist');
    }
};

// The bytes of a PDF always start with "%PDF". Sniff them so a PDF is
// recognised even when the blob has no useful name (e.g. a file downloaded
// back from Supabase storage, whose Blob has no `.name`).
const looksLikePdf = (buf) => {
    if (!buf || buf.byteLength < 5) return false;
    const head = new Uint8Array(buf, 0, 5);
    return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
};

export const extractCVText = async (file, nameHint = '') => {
    if (!file) return '';
    const name = String(file.name || nameHint || '').toLowerCase();

    try {
        // ---- PDF ----
        if (name.endsWith('.pdf') || file.type === 'application/pdf') {
            const pdfjs = await loadPdfJs();
            // ALWAYS use the CDN worker - the bundled worker is broken in the
            // production build (private-field mangling), which made extraction
            // hang and the agent unable to read PDF CVs.
            pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN;
            const buf = await file.arrayBuffer();
            if (!looksLikePdf(buf)) return ''; // not actually a PDF
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

        // ---- DOCX / DOC ----
        if (name.endsWith('.docx') || name.endsWith('.doc')) {
            const mammoth = await import('mammoth/mammoth.browser');
            const buf = await file.arrayBuffer();
            const result = await withTimeout(mammoth.extractRawText({ arrayBuffer: buf }), EXTRACT_TIMEOUT_MS);
            return String(result?.value || '').trim();
        }

        // ---- plain text ----
        if (name.endsWith('.txt')) {
            return String(await file.text()).trim();
        }
    } catch (err) {
        // Extraction failed - fall through to '' so the flow is never blocked.
        console.error('CV text extraction failed:', err);
    }

    return '';
};
