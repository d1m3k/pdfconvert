import { createQueue, saveBlob, statusSetter } from './workbench';
import { runQpdf } from './qpdf';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const pw = document.getElementById('pw') as HTMLInputElement;

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  status,
  onChange: (files) => { go.disabled = files.length === 0; status(files.length ? `${files[0].name} ready. Enter its password if it has one.` : 'Add a PDF file to unlock.'); },
});

go.addEventListener('click', async () => {
  const file = queue.files[0];
  if (!file) return;
  go.disabled = true;
  try {
    status('Loading the decryption engine (first use downloads it once)…');
    const input = new Uint8Array(await file.arrayBuffer());
    const args = pw.value
      ? [`--password=${pw.value}`, '--decrypt', '/in.pdf', '/out.pdf']
      : ['--decrypt', '/in.pdf', '/out.pdf'];
    const out = await runQpdf(input, args);
    saveBlob(new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-unlocked.pdf');
    status('Done — the saved copy opens without a password. It never left your device.');
  } catch {
    status('Unlocking failed. If the file asks for a password to open, type that exact password above — this tool cannot guess or crack passwords.', true);
  } finally { go.disabled = queue.files.length === 0; }
});
