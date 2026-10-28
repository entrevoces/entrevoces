import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { indexSource } from "../packages/engine-core/knowledge.js";
const run = promisify(execFile);
export const RESOURCE_LIMITS = { bytes: 10 * 1024 * 1024, pages: 200, characters: 400000 };
const invalid = (message) => Object.assign(new Error(message), { status: 422 });
export async function extractionCapabilities() {
  try { await run(process.env.PDFTOTEXT_PATH || "pdftotext", ["-v"], { timeout: 5000 }); return { pdf: true, text: true, limits: RESOURCE_LIMITS }; }
  catch { return { pdf: false, text: true, limits: RESOURCE_LIMITS, pdfMessage: "Install Poppler (pdftotext) on the engine host, or upload the PDF's extracted text. Scans require OCR before import." }; }
}
export async function extractResource(input) {
  if (!input || typeof input.fileName !== "string" || !input.fileName.trim()) throw invalid("Resource filename is required.");
  const kind = input.fileName.toLowerCase().endsWith(".pdf") ? "pdf" : /\.(txt|md)$/i.test(input.fileName) ? "text" : null;
  if (!kind) throw invalid("Supported resources: .pdf, .txt and .md. Export other formats first.");
  let bytes, extracted;
  if (kind === "pdf") {
    if (typeof input.base64 !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64) || input.base64.length % 4) throw invalid("PDF upload must contain valid base64 bytes.");
    bytes = Buffer.from(input.base64, "base64");
    if (bytes.length > RESOURCE_LIMITS.bytes) throw invalid("Resource exceeds the 10 MiB upload limit.");
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw invalid("The file does not have a PDF signature.");
    const folder = await mkdtemp(join(tmpdir(), "ev-source-"));
    try {
      const path = join(folder, "source.pdf");
      await writeFile(path, bytes, { mode: 0o600 });
      const result = await run(process.env.PDFTOTEXT_PATH || "pdftotext", ["-layout", "-enc", "UTF-8", path, "-"], { timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
      extracted = result.stdout;
    } catch (e) {
      throw invalid(e.code === "ENOENT" ? "PDF extraction unavailable: install Poppler/pdftotext on the engine host, or import extracted text." : "PDF extraction failed. Check for encryption, corruption or an image-only scan; perform OCR and retry. No partial source was accepted.");
    } finally { await rm(folder, { recursive: true, force: true }); }
  } else {
    if (typeof input.text !== "string") throw invalid("Text resource requires a UTF-8 text field.");
    extracted = input.text;
    bytes = Buffer.from(extracted);
    if (bytes.length > RESOURCE_LIMITS.bytes) throw invalid("Resource exceeds the 10 MiB upload limit.");
  }
  const pages = extracted.replace(/\r\n?/g, "\n").split("\f");
  if (!pages[pages.length - 1]?.trim()) pages.pop();
  if (pages.length > RESOURCE_LIMITS.pages || extracted.length > RESOURCE_LIMITS.characters) throw invalid("Resource exceeds 200 pages or 400,000 extracted characters. Split it into named volumes; nothing was silently truncated.");
  if (extracted.trim().length < 80) throw invalid("Too little readable text for grounded synthesis. Scanned PDFs require OCR before import.");
  const blankPages = pages.flatMap((p, i) => p.trim().length < 20 ? [i + 1] : []);
  const passages = indexSource(pages);
  return { fingerprint: createHash("sha256").update(bytes).digest("hex"), fileName: input.fileName, kind, pageCount: pages.length, characters: extracted.length, blankPages, passages, extractor: kind === "pdf" ? "pdftotext-layout" : "utf8", warnings: blankPages.length ? [`Pages ${blankPages.join(", ")} have little readable text. Verify extraction or OCR before publishing.`] : [] };
}
