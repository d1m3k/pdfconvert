import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createQueue, saveBlob, statusSetter } from './workbench';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const formatSel = document.getElementById('format') as HTMLSelectElement;
const posSel = document.getElementById('position') as HTMLSelectElement;

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  status,
  onChange: (files) => { go.disabled = files.length === 0; status(files.length ? `${files[0].name} ready. Choose a format and position.` : 'Add a PDF file to number.'); },
});

go.addEventListener('click', async () => {
  const file = queue.files[0];
  if (!file) return;
  go.disabled = true;
  try {
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const size = 10;
    const total = doc.getPageCount();
    const fmt = (n: number) => formatSel.value === 'plain' ? `${n}` : formatSel.value === 'of' ? `${n} / ${total}` : `Page ${n} of ${total}`;
    doc.getPages().forEach((page, i) => {
      const label = fmt(i + 1);
      const { width, height } = page.getSize();
      const tw = font.widthOfTextAtSize(label, size);
      const pos = posSel.value;
      const x = pos.endsWith('right') ? width - 36 - tw : pos.endsWith('left') ? 36 : (width - tw) / 2;
      const y = pos.startsWith('top') ? height - 26 : 22;
      page.drawText(label, { x, y, size, font, color: rgb(0.25, 0.25, 0.28) });
    });
    const out = await doc.save();
    saveBlob(new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-numbered.pdf');
    status(`Done — ${total} page(s) numbered. It never left your device.`);
  } catch { status('That PDF could not be processed — it may be corrupted or password-protected.', true); }
  finally { go.disabled = queue.files.length === 0; }
});
