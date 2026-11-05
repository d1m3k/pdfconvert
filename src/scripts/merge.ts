import { PDFDocument } from 'pdf-lib';
import { createQueue, saveBlob, statusSetter, fmtSize } from './workbench';

const zone = document.getElementById('dz')!;
const input = document.getElementById('file') as HTMLInputElement;
const list = document.getElementById('filelist')!;
const go = document.getElementById('go') as HTMLButtonElement;
const status = statusSetter(document.getElementById('status')!);

const queue = createQueue({
  zone, input, list,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  reorder: true,
  status,
  onChange: (files) => {
    go.disabled = files.length < 2;
    status(files.length === 0 ? 'Add at least two PDF files to merge.'
      : files.length === 1 ? 'Add one more PDF — merging needs at least two files.'
      : `${files.length} files ready. Use ↑ ↓ to set the final order.`);
  },
});

go.addEventListener('click', async () => {
  const files = queue.files;
  if (files.length < 2) return;
  go.disabled = true;
  try {
    const out = await PDFDocument.create();
    let pages = 0;
    for (let i = 0; i < files.length; i++) {
      status(`Reading ${i + 1} of ${files.length}: ${files[i].name}…`);
      const bytes = await files[i].arrayBuffer();
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await out.copyPages(src, src.getPageIndices());
      copied.forEach((p) => out.addPage(p));
      pages += copied.length;
    }
    status('Building your merged PDF…');
    const merged = await out.save();
    saveBlob(new Blob([merged.buffer as ArrayBuffer], { type: 'application/pdf' }), 'merged.pdf');
    status(`Done — ${files.length} files combined into one PDF with ${pages} pages (${fmtSize(merged.length)}). It never left your device.`);
  } catch (err) {
    console.error(err);
    status('Something went wrong reading one of the files. It may be corrupted or password-protected — remove it and try again.', true);
  } finally {
    go.disabled = queue.files.length < 2;
  }
});
