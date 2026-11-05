import { PDFDocument } from 'pdf-lib';
import { createQueue, saveBlob, statusSetter, fmtSize } from './workbench';
import { getPdfjs } from './pdfjs';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const levelSel = document.getElementById('level') as HTMLSelectElement;

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  status,
  onChange: (files) => { go.disabled = files.length === 0; status(files.length ? `${files[0].name} (${fmtSize(files[0].size)}) ready. Pick a level and compress.` : 'Add a PDF file to compress.'); },
});

// Client-side compression = rebuild each page as an efficient JPEG at the chosen
// resolution. Best for scanned / image-heavy PDFs; text becomes part of the image.
go.addEventListener('click', async () => {
  const file = queue.files[0];
  if (!file) return;
  go.disabled = true;
  try {
    const [dpi, quality] = levelSel.value.split(':').map(Number);
    const pdfjs = await getPdfjs();
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const out = await PDFDocument.create();
    for (let i = 1; i <= doc.numPages; i++) {
      status(`Rebuilding page ${i} of ${doc.numPages} at ${dpi} DPI…`);
      const page = await doc.getPage(i);
      const unscaled = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: dpi / 72 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality));
      const img = await out.embedJpg(await blob.arrayBuffer());
      const newPage = out.addPage([unscaled.width, unscaled.height]);
      newPage.drawImage(img, { x: 0, y: 0, width: unscaled.width, height: unscaled.height });
    }
    const bytes = await out.save();
    if (bytes.length >= file.size) {
      status(`The rebuilt file (${fmtSize(bytes.length)}) is not smaller than your original (${fmtSize(file.size)}) — your PDF is already efficient, so no download was made. A stronger level may help image-heavy files.`, true);
    } else {
      saveBlob(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-compressed.pdf');
      const pct = Math.round((1 - bytes.length / file.size) * 100);
      status(`Done — ${fmtSize(file.size)} became ${fmtSize(bytes.length)} (−${pct}%). It never left your device.`);
    }
  } catch { status('That PDF could not be processed — it may be corrupted or password-protected.', true); }
  finally { go.disabled = queue.files.length === 0; }
});
