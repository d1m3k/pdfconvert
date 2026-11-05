import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { createQueue, saveBlob, statusSetter, fmtSize } from './workbench';
import { parseGroups } from './ranges';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const modeSel = document.getElementById('mode') as HTMLSelectElement;
const rangesInput = document.getElementById('ranges') as HTMLInputElement;
let pageCount = 0;

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  status,
  onChange: async (files) => {
    go.disabled = files.length === 0;
    if (files.length === 0) { status('Add a PDF file to split.'); return; }
    try {
      const doc = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
      pageCount = doc.getPageCount();
      status(`${files[0].name} has ${pageCount} page(s). Choose how to split it.`);
    } catch { status('That PDF could not be read — it may be corrupted or password-protected.', true); go.disabled = true; }
  },
});

go.addEventListener('click', async () => {
  const file = queue.files[0];
  if (!file) return;
  go.disabled = true;
  try {
    const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const base = file.name.replace(/\.pdf$/i, '');
    const outputs: { name: string; blob: Blob }[] = [];
    if (modeSel.value === 'every') {
      status(`Splitting into ${pageCount} separate pages…`);
      for (let i = 0; i < pageCount; i++) {
        const out = await PDFDocument.create();
        const [p] = await out.copyPages(src, [i]);
        out.addPage(p);
        outputs.push({ name: `${base}-page-${i + 1}.pdf`, blob: new Blob([await out.save()], { type: 'application/pdf' }) });
      }
    } else {
      const groups = parseGroups(rangesInput.value, pageCount);
      status(`Building ${groups.length} file(s) from your ranges…`);
      for (const [a, b] of groups) {
        const out = await PDFDocument.create();
        const idx = Array.from({ length: b - a + 1 }, (_, k) => a + k);
        const pages = await out.copyPages(src, idx);
        pages.forEach(p => out.addPage(p));
        outputs.push({ name: `${base}-pages-${a + 1}-${b + 1}.pdf`, blob: new Blob([await out.save()], { type: 'application/pdf' }) });
      }
    }
    if (outputs.length === 1) {
      saveBlob(outputs[0].blob, outputs[0].name);
      status(`Done — saved ${outputs[0].name} (${fmtSize(outputs[0].blob.size)}). It never left your device.`);
    } else {
      const zip = new JSZip();
      outputs.forEach(o => zip.file(o.name, o.blob));
      saveBlob(await zip.generateAsync({ type: 'blob' }), `${base}-split.zip`);
      status(`Done — ${outputs.length} PDFs packed into ${base}-split.zip. It never left your device.`);
    }
  } catch (err) {
    status(err instanceof Error ? err.message : 'Splitting failed. Check the ranges and try again.', true);
  } finally { go.disabled = queue.files.length === 0; }
});
