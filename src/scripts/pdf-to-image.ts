import JSZip from 'jszip';
import { createQueue, saveBlob, statusSetter, fmtSize } from './workbench';
import { getPdfjs } from './pdfjs';

// Shared engine for PDF to JPG / PDF to PNG; the entry script sets the format.
export function initPdfToImage(format: 'image/jpeg' | 'image/png', ext: string) {
  const status = statusSetter(document.getElementById('status')!);
  const go = document.getElementById('go') as HTMLButtonElement;
  const dpiSel = document.getElementById('dpi') as HTMLSelectElement;
  const results = document.getElementById('results')!;

  const queue = createQueue({
    zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
    accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    rejectMessage: 'only PDF files are accepted here.',
    status,
    onChange: (files) => { go.disabled = files.length === 0; status(files.length ? `${files[0].name} ready. Choose a resolution and convert.` : 'Add a PDF file to convert.'); },
  });

  go.addEventListener('click', async () => {
    const file = queue.files[0];
    if (!file) return;
    go.disabled = true;
    results.innerHTML = '';
    try {
      const pdfjs = await getPdfjs();
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const dpi = Number(dpiSel.value);
      const scale = dpi / 72;
      const base = file.name.replace(/\.pdf$/i, '');
      const made: { name: string; blob: Blob }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        status(`Rendering page ${i} of ${doc.numPages} at ${dpi} DPI…`);
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
        const ctx = canvas.getContext('2d')!;
        if (format === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), format, format === 'image/jpeg' ? 0.92 : undefined));
        made.push({ name: `${base}-page-${i}.${ext}`, blob });
        const row = document.createElement('div');
        row.className = 'result';
        const grow = document.createElement('span');
        grow.className = 'grow';
        grow.textContent = `${base}-page-${i}.${ext} · ${canvas.width}×${canvas.height}`;
        const meta = document.createElement('span');
        meta.className = 'savings';
        meta.textContent = fmtSize(blob.size);
        const dl = document.createElement('button');
        dl.className = 'btn small';
        dl.textContent = 'Download';
        const item = made[made.length - 1];
        dl.onclick = () => saveBlob(item.blob, item.name);
        row.append(grow, meta, dl);
        results.appendChild(row);
      }
      if (made.length > 1) {
        const zipBtn = document.createElement('button');
        zipBtn.className = 'btn ghost small';
        zipBtn.textContent = `Download all ${made.length} pages as ZIP`;
        zipBtn.onclick = async () => {
          const zip = new JSZip();
          made.forEach(m => zip.file(m.name, m.blob));
          saveBlob(await zip.generateAsync({ type: 'blob' }), `${base}-pages.zip`);
        };
        results.appendChild(zipBtn);
      }
      status(`Done — ${made.length} page(s) exported as ${ext.toUpperCase()} at ${dpi} DPI. It never left your device.`);
    } catch { status('That PDF could not be rendered — it may be corrupted or password-protected.', true); }
    finally { go.disabled = queue.files.length === 0; }
  });
}
