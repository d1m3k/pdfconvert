import { PDFDocument } from 'pdf-lib';
import { createQueue, saveBlob, statusSetter } from './workbench';
import { getPdfjs } from './pdfjs';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const stage = document.getElementById('stage') as HTMLCanvasElement;
const pageSel = document.getElementById('page') as HTMLSelectElement;
const widthRange = document.getElementById('sigwidth') as HTMLInputElement;
const pad = document.getElementById('pad') as HTMLCanvasElement;
const clearBtn = document.getElementById('clearpad') as HTMLButtonElement;

let pdfBytes: ArrayBuffer | null = null;
let pageDims: { w: number; h: number }[] = [];
let clickPt: { x: number; y: number } | null = null; // in stage-canvas pixels
let hasInk = false;

// ---- signature pad ----
const pctx = pad.getContext('2d')!;
pctx.lineWidth = 2.6; pctx.lineCap = 'round'; pctx.strokeStyle = '#14213d';
let drawing = false;
const padPos = (e: PointerEvent) => { const r = pad.getBoundingClientRect(); return { x: (e.clientX - r.left) * (pad.width / r.width), y: (e.clientY - r.top) * (pad.height / r.height) }; };
pad.addEventListener('pointerdown', (e) => { drawing = true; hasInk = true; const p = padPos(e); pctx.beginPath(); pctx.moveTo(p.x, p.y); pad.setPointerCapture(e.pointerId); refreshGo(); });
pad.addEventListener('pointermove', (e) => { if (!drawing) return; const p = padPos(e); pctx.lineTo(p.x, p.y); pctx.stroke(); });
pad.addEventListener('pointerup', () => { drawing = false; });
clearBtn.addEventListener('click', () => { pctx.clearRect(0, 0, pad.width, pad.height); hasInk = false; refreshGo(); });

function refreshGo() { go.disabled = !(pdfBytes && hasInk); }

async function renderStage() {
  if (!pdfBytes) return;
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ data: pdfBytes.slice(0) }).promise;
  const idx = Number(pageSel.value);
  const page = await doc.getPage(idx + 1);
  const vp = page.getViewport({ scale: 1 });
  const scale = Math.min(1.4, 680 / vp.width);
  const rvp = page.getViewport({ scale });
  stage.width = Math.ceil(rvp.width); stage.height = Math.ceil(rvp.height);
  await page.render({ canvasContext: stage.getContext('2d')!, viewport: rvp }).promise;
  clickPt = null;
  status(`Showing page ${idx + 1}. Draw your signature, then click the page where it should sit — or leave it and it lands at the bottom right.`);
}

stage.addEventListener('click', (e) => {
  const r = stage.getBoundingClientRect();
  clickPt = { x: (e.clientX - r.left) * (stage.width / r.width), y: (e.clientY - r.top) * (stage.height / r.height) };
  status('Placement set where you clicked. You can click again to move it.');
});

pageSel.addEventListener('change', renderStage);

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  status,
  onChange: async (files) => {
    if (files.length === 0) { pdfBytes = null; refreshGo(); status('Add the PDF to sign.'); return; }
    try {
      pdfBytes = await files[0].arrayBuffer();
      const pdfjs = await getPdfjs();
      const doc = await pdfjs.getDocument({ data: pdfBytes.slice(0) }).promise;
      pageSel.innerHTML = '';
      pageDims = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        const vp = p.getViewport({ scale: 1 });
        pageDims.push({ w: vp.width, h: vp.height });
        const opt = document.createElement('option');
        opt.value = String(i - 1); opt.textContent = `Page ${i}`;
        pageSel.appendChild(opt);
      }
      await renderStage();
      refreshGo();
    } catch { status('That PDF could not be rendered — it may be corrupted or password-protected.', true); }
  },
});

// Trim transparent margins off the signature pad and return PNG bytes + aspect.
function trimmedSignature(): { bytes: Promise<ArrayBuffer>; aspect: number } {
  const data = pctx.getImageData(0, 0, pad.width, pad.height).data;
  let minX = pad.width, minY = pad.height, maxX = -1, maxY = -1;
  for (let y = 0; y < pad.height; y++) for (let x = 0; x < pad.width; x++) {
    if (data[(y * pad.width + x) * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.drawImage(pad, minX, minY, w, h, 0, 0, w, h);
  return { bytes: new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png')).then(b => b.arrayBuffer()), aspect: w / h };
}

go.addEventListener('click', async () => {
  if (!pdfBytes || !hasInk) return;
  go.disabled = true;
  try {
    const idx = Number(pageSel.value);
    const dims = pageDims[idx];
    const sig = trimmedSignature();
    const doc = await PDFDocument.load(pdfBytes.slice(0), { ignoreEncryption: true });
    const img = await doc.embedPng(await sig.bytes);
    const sigW = dims.w * (Number(widthRange.value) / 100);
    const sigH = sigW / sig.aspect;
    let cx: number, cy: number; // centre, PDF points, bottom-left origin
    if (clickPt) {
      const sx = dims.w / stage.width, sy = dims.h / stage.height;
      cx = clickPt.x * sx; cy = dims.h - clickPt.y * sy;
    } else { cx = dims.w - sigW / 2 - 48; cy = 48 + sigH / 2; }
    doc.getPage(idx).drawImage(img, { x: cx - sigW / 2, y: cy - sigH / 2, width: sigW, height: sigH });
    const out = await doc.save();
    saveBlob(new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' }), 'signed.pdf');
    status(`Done — signature placed on page ${idx + 1}. It never left your device.`);
  } catch { status('Signing failed for this file. Try a fresh copy of the PDF.', true); }
  finally { refreshGo(); }
});
