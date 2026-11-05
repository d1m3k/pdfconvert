import { PDFDocument, degrees } from 'pdf-lib';
import { createQueue, saveBlob, statusSetter } from './workbench';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const angleSel = document.getElementById('angle') as HTMLSelectElement;
const scopeSel = document.getElementById('scope') as HTMLSelectElement;

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  status,
  onChange: (files) => { go.disabled = files.length === 0; status(files.length ? `${files[0].name} ready. Pick a direction and which pages to turn.` : 'Add a PDF file to rotate.'); },
});

go.addEventListener('click', async () => {
  const file = queue.files[0];
  if (!file) return;
  go.disabled = true;
  try {
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const delta = Number(angleSel.value);
    const scope = scopeSel.value;
    let changed = 0;
    doc.getPages().forEach((page, i) => {
      const { width, height } = page.getSize();
      const landscape = width > height;
      const apply = scope === 'all' || (scope === 'odd' && i % 2 === 0) || (scope === 'even' && i % 2 === 1)
        || (scope === 'landscape' && landscape) || (scope === 'portrait' && !landscape);
      if (!apply) return;
      page.setRotation(degrees((page.getRotation().angle + delta + 360) % 360));
      changed++;
    });
    const out = await doc.save();
    saveBlob(new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-rotated.pdf');
    status(`Done — ${changed} page(s) rotated ${delta > 0 ? `${delta}° clockwise` : delta === -90 ? '90° counter-clockwise' : '180°'}. It never left your device.`);
  } catch { status('That PDF could not be processed — it may be corrupted or password-protected.', true); }
  finally { go.disabled = queue.files.length === 0; }
});
