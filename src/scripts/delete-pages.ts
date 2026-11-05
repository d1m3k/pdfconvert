import { PDFDocument } from 'pdf-lib';
import { createQueue, saveBlob, statusSetter } from './workbench';
import { parseRanges } from './ranges';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const pagesInput = document.getElementById('pages') as HTMLInputElement;
let pageCount = 0;

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  status,
  onChange: async (files) => {
    go.disabled = files.length === 0;
    if (files.length === 0) { status('Add a PDF file to remove pages from.'); return; }
    try {
      const doc = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
      pageCount = doc.getPageCount();
      status(`${files[0].name} has ${pageCount} page(s). Type the pages to remove below.`);
    } catch { status('That PDF could not be read — it may be corrupted or password-protected.', true); go.disabled = true; }
  },
});

go.addEventListener('click', async () => {
  const file = queue.files[0];
  if (!file) return;
  go.disabled = true;
  try {
    const toDelete = parseRanges(pagesInput.value, pageCount);
    if (toDelete.length >= pageCount) throw new Error('That would delete every page. A PDF needs at least one page — keep at least one.');
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    [...toDelete].sort((a, b) => b - a).forEach(idx => doc.removePage(idx));
    const out = await doc.save();
    saveBlob(new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-trimmed.pdf');
    status(`Done — removed ${toDelete.length} page(s); ${doc.getPageCount()} remain. It never left your device.`);
  } catch (err) {
    status(err instanceof Error ? err.message : 'Something went wrong. Check the page list and try again.', true);
  } finally { go.disabled = queue.files.length === 0; }
});
