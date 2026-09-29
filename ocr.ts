import { createWorker } from 'tesseract.js';
export type DocKind = 'blank' | 'prescription' | 'report' | 'unknown';
export interface Med { name: string; dose?: string; frequency?: string }
export interface OcrResult { kind: DocKind; text: string; confidence: number; medicines: Med[] }

export async function scan(image: HTMLCanvasElement | HTMLVideoElement | string): Promise<OcrResult> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(image as any);
    const text = data.text.trim(), kind = classify(text, data.confidence);
    return { kind, text, confidence: data.confidence, medicines: kind === 'prescription' ? extractMeds(text) : [] };
  } finally { await worker.terminate(); }
}
export function classify(text: string, conf: number): DocKind {
  const words = text.match(/[A-Za-z]{3,}/g)?.length ?? 0;
  if (words < 3) return 'blank';
  if (/\b(rx|tab|tablet|cap|syp|inj)\b|\b\d+\s?(mg|ml|mcg)\b|\b(bd|tds|od|qid|hs|sos)\b|1-0-1|1-1-1/i.test(text)) return 'prescription';
  if (/(hemoglobin|wbc|rbc|platelet|creatinine|mg\/dl|reference range|radiolog|impression|x-?ray|invoice|total amount|bill)/i.test(text)) return 'report';
  return conf > 40 ? 'unknown' : 'blank';
}
export function extractMeds(text: string): Med[] {
  const out: Med[] = [];
  for (const line of text.split('\n')) {
    if (!/(mg|mcg|ml|tab|cap|syp|inj)/i.test(line)) continue;
    const m = line.match(/(?:tab\.?|cap\.?|syp\.?|inj\.?)?\s*([A-Z][A-Za-z\-]{2,}(?:\s[A-Z][A-Za-z]+)?)\s*(\d+\s?(?:mg|mcg|ml|g))?/);
    if (!m) continue;
    const f = line.match(/\b(bd|tds|od|qid|hs|sos)\b|\d-\d-\d|(once|twice|thrice)\s+(a\s+)?day/i);
    out.push({ name: m[1], dose: m[2], frequency: f?.[0] });
  }
  return out;
}
export const BLANK_GUIDE = 'This page looks empty. Hold the phone steady above the paper. To write, start at the top left corner, leave a margin of two fingers, and write on the printed lines. Say "read" once you have written something and I will scan it again.';
// Prompt for a server-side LLM endpoint (e.g. /api/ai/explain) that explains reports and prescriptions
export function explainPrompt(r: OcrResult) {
  return r.kind === 'prescription'
    ? `Prescription OCR text:\n${r.text}\nList each medicine with dosage, frequency, uses, common side effects and key interactions in simple, comforting language. Advise confirming with the prescribing doctor.`
    : `Medical document OCR text:\n${r.text}\nSummarise in plain, reassuring language. Explain each metric and whether it is in range. Do not diagnose; recommend consulting a doctor.`;
}
export const speak = (t: string) => { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = 0.9; speechSynthesis.speak(u); };
export function listen(onText: (t: string) => void) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SR) return null;
  const r = new SR(); r.onresult = (e: any) => onText(e.results[0][0].transcript); r.start(); return r;
}
