// CV text extraction - pulls readable text out of an uploaded CV file so the
// AI agent can build on it instead of asking the user to repeat themselves.
// Supports PDF, DOCX/DOC (mammoth) and TXT. Returns '' if the file type is
// unsupported or the extraction fails - and it can NEVER hang: every step is
// raced against a timeout so the conversation never blocks.
//
// WHY NO pdfjs (2026-08-16): pdfjs-dist's webpack-emitted worker is corrupted
// by the CRA production build (Terser mangles its ESM private class fields ->
// "Private field '#T' must be declared in an enclosing class"), and the CDN
// copy is unreachable on some networks (the import hangs forever). So PDF
// text is now extracted with a small self-contained parser below, using the
// bundled `pako` (already in node_modules) to inflate FlateDecode streams.
// Handles the common text-based CV structure. Scanned/image-only PDFs yield
// '' and the conversation falls back gracefully.

import pako from 'pako';

const EXTRACT_TIMEOUT_MS = 15000;

// Promise.race wrapper: if extraction takes longer than the timeout, resolve
// with '' instead of blocking forever.
const withTimeout = (promise, ms) =>
    Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve(''), ms)),
    ]);

/* ================= minimal PDF text extraction ================= */

const latin1 = (u8) => {
    let s = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < u8.length; i += CHUNK) {
        s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
    }
    return s;
};

// find the next occurrence of an ASCII keyword in a byte array
const indexOfBytes = (u8, from, kw) => {
    const first = kw.charCodeAt(0);
    for (let i = from; i + kw.length <= u8.length; i++) {
        if (u8[i] !== first) continue;
        let ok = true;
        for (let k = 1; k < kw.length; k++) {
            if (u8[i + k] !== kw.charCodeAt(k)) { ok = false; break; }
        }
        if (ok) return i;
    }
    return -1;
};

// last occurrence of a keyword at or before `before`
const lastIndexOfBytes = (u8, before, kw) => {
    for (let i = Math.min(before, u8.length - kw.length); i >= 0; i--) {
        let ok = true;
        for (let k = 0; k < kw.length; k++) {
            if (u8[i + k] !== kw.charCodeAt(k)) { ok = false; break; }
        }
        if (ok) return i;
    }
    return -1;
};

// collect every object stream's bytes; inflate FlateDecode ones
const collectContentStreams = (u8) => {
    const out = [];
    let i = 0;
    const len = u8.length;
    while (i < len) {
        const s = indexOfBytes(u8, i, 'stream');
        if (s < 0) break;
        // header window = from the last object boundary to the 'stream' keyword
        const boundary = Math.max(
            lastIndexOfBytes(u8, s, 'endobj'),
            lastIndexOfBytes(u8, s, 'endstream')
        );
        const headerStart = boundary > 0 ? boundary : Math.max(0, s - 200);
        const header = latin1(u8.subarray(headerStart, s));
        const isFlate = /\/FlateDecode/.test(header);
        const isFiltered = /\/Filter/.test(header);
        // stream data start (after "stream" + optional EOL)
        let p = s + 6;
        if (u8[p] === 13) p++;
        if (u8[p] === 10) p++;
        const e = indexOfBytes(u8, p, 'endstream');
        if (e < 0) break;
        let data = u8.subarray(p, e);
        let dl = data.length;
        while (dl > 0 && (data[dl - 1] === 10 || data[dl - 1] === 13)) dl--;
        data = data.subarray(0, dl);
        if (isFlate) {
            let dec = null;
            try { dec = pako.inflate(data); } catch { /* try raw below */ }
            if (!dec) {
                try { dec = pako.inflate(data, { raw: true }); } catch { dec = null; }
            }
            if (dec) out.push(dec);
        } else if (!isFiltered) {
            out.push(data);
        }
        i = e + 9;
    }
    return out;
};

const isWS = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f';
const isDelim = (c) => '()<>[]{}/%'.indexOf(c) >= 0;

const nextToken = (s, from) => {
    let i = from;
    while (i < s.length && isWS(s[i])) i++;
    const start = i;
    while (i < s.length && !isWS(s[i]) && !isDelim(s[i])) i++;
    return { token: s.slice(start, i), next: i };
};

// parse a PDF literal string starting at '(' (handles escapes/octals)
const parsePdfString = (s, from) => {
    let i = from + 1;
    let out = '';
    while (i < s.length) {
        const c = s[i];
        if (c === '\\') {
            const e = s[i + 1];
            if (e >= '0' && e <= '7') {
                let v = 0, k = 0;
                while (k < 3 && i + 1 + k < s.length) {
                    const d = s[i + 1 + k];
                    if (!(d >= '0' && d <= '7')) break;
                    v = v * 8 + (d.charCodeAt(0) - 48);
                    k++;
                }
                out += String.fromCharCode(v);
                i += 1 + k;
            } else if (e === 'n') { out += '\n'; i += 2; }
            else if (e === 'r') { out += '\r'; i += 2; }
            else if (e === 't') { out += '\t'; i += 2; }
            else if (e === 'b') { out += '\b'; i += 2; }
            else if (e === 'f') { out += '\f'; i += 2; }
            else if (e === '\r') { i += 2; } // line continuation
            else if (e === '\n') { i += 2; }
            else { out += e; i += 2; }
        } else if (c === ')') {
            return { text: out, next: i + 1 };
        } else {
            out += c;
            i++;
        }
    }
    return { text: out, next: i };
};

// pull readable text out of one decoded content stream
const extractContentText = (s) => {
    let out = '';
    let i = 0;
    const n = s.length;
    while (i < n) {
        const c = s[i];
        if (c === '(') {
            const r = parsePdfString(s, i);
            const t = nextToken(s, r.next);
            if (t.token === 'Tj' || t.token === "'" || t.token === '"') {
                out += r.text;
                if (t.token === "'" || t.token === '"') out += '\n';
                i = t.next;
            } else {
                i = r.next; // not a shown string - skip
            }
        } else if (c === '[') {
            let j = i + 1, depth = 1;
            const parts = [];
            while (j < n && depth > 0) {
                if (s[j] === '(') {
                    const r = parsePdfString(s, j);
                    parts.push(r.text);
                    j = r.next;
                } else if (s[j] === '[') { depth++; j++; }
                else if (s[j] === ']') { depth--; j++; }
                else j++;
            }
            const t = nextToken(s, j);
            if (t.token === 'TJ') { out += parts.join(''); i = t.next; }
            else i++;
        } else if (c === 'T' || c === "'" || c === '"') {
            const t = nextToken(s, i);
            const op = t.token;
            if (op === 'Td' || op === 'TD' || op === 'T*') out += '\n';
            i = t.next;
        } else {
            i++;
        }
    }
    return out;
};

// convert raw PDF bytes to plain text
const extractPdfText = (u8) => {
    const streams = collectContentStreams(u8);
    if (!streams.length) return '';
    const parts = streams.map((s) => extractContentText(latin1(s))).join('\n');
    const cleaned = parts
        .replace(/\u0000/g, '') // strip UTF-16 interleaved nulls ("C\0h\0a\0p" -> "Chap")
        .replace(/[ \t]+/g, ' ')
        .replace(/[ \t]*\n[ \t]*/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    // Garbage guard: if most characters are not printable text, this PDF has
    // no extractable text (scanned/image-only or non-Latin font subset). Return
    // '' so the flow falls back gracefully instead of sending junk to the AI.
    if (cleaned) {
        const printable = (cleaned.match(/[A-Za-z0-9\u00C0-\u024F\u0600-\u06FF.,!?;:'"()@#&%+\-/\x5C_=*$]/g) || []).length;
        if (printable / cleaned.length < 0.4) return '';
    }
    return cleaned;
};

/* ============ primary: full pdfjs (bundled lib + verbatim worker) ============ */
// The robust full pdfjs library handles all PDF structures + font encodings.
// The worker is served VERBATIM from /pdf.worker.min.mjs (copied into public/
// from node_modules - CRA copies it unprocessed, so it is NOT corrupted like
// the webpack-emitted worker was, and it is same-origin so no CDN is needed).
// Falls back to '' (caller then tries the self-contained extractor).
const tryPdfJs = async (u8) => {
    try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = (process.env.PUBLIC_URL || '') + '/pdf.worker.min.mjs';
        const doc = await pdfjs.getDocument({ data: u8 }).promise;
        let text = '';
        for (let i = 1; i <= doc.numPages; i += 1) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((it) => it.str || '').join(' ') + '\n';
        }
        try { await doc.destroy(); } catch { /* ignore */ }
        return text.trim();
    } catch (err) {
        console.error('pdfjs extraction failed, using fallback:', err);
        return '';
    }
};

/* ================= public API ================= */

export const extractCVText = async (file, nameHint = '') => {
    if (!file) return '';
    const name = String(file.name || nameHint || '').toLowerCase();

    try {
        // ---- PDF ----
        if (name.endsWith('.pdf') || file.type === 'application/pdf') {
            const buf = await file.arrayBuffer();
            const u8 = new Uint8Array(buf);
            // magic bytes must be "%PDF"
            if (u8.length < 5 || u8[0] !== 0x25 || u8[1] !== 0x50 || u8[2] !== 0x44 || u8[3] !== 0x46) return '';
            // 1) full pdfjs (robust - handles encodings/object streams)
            let text = await withTimeout(tryPdfJs(u8), EXTRACT_TIMEOUT_MS);
            // 2) fallback: self-contained extractor (works offline, no worker)
            if (!text || !text.trim()) {
                text = await withTimeout(Promise.resolve().then(() => extractPdfText(u8)), EXTRACT_TIMEOUT_MS);
            }
            return String(text || '').trim();
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
