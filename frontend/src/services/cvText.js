// CV text extraction - pulls readable text out of an uploaded CV file so the
// AI agent can build on it instead of asking the user to repeat themselves.
// Supports PDF (pdfjs-dist) and DOCX/DOC (mammoth). Returns '' if the file
// type is unsupported or the extraction fails (the agent then falls back to
// the normal question flow).

export const extractCVText = async (file) => {
    if (!file) return '';
    const name = String(file.name || '').toLowerCase();

    try {
        if (name.endsWith('.pdf')) {
            const pdfjs = await import('pdfjs-dist');
            // Worker setup for the browser build (create-react-app friendly).
            const workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
            pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
            const buf = await file.arrayBuffer();
            const doc = await pdfjs.getDocument({ data: buf }).promise;
            let text = '';
            for (let i = 1; i <= doc.numPages; i += 1) {
                const page = await doc.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map((it) => it.str || '').join(' ') + '\n';
            }
            await doc.destroy();
            return text.trim();
        }

        if (name.endsWith('.docx') || name.endsWith('.doc')) {
            const mammoth = await import('mammoth/mammoth.browser');
            const buf = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: buf });
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
