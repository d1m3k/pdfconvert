import { createQueue, saveBlob, statusSetter } from './workbench';
import { runQpdf } from './qpdf';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const pw = document.getElementById('pw') as HTMLInputElement;
const pw2 = document.getElementById('pw2') as HTMLInputElement;

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  status,
  onChange: (files) => { go.disabled = files.length === 0; status(files.length ? `${files[0].name} ready. Set the password that will open it.` : 'Add a PDF file to protect.'); },
});

go.addEventListener('click', async () => {
  const file = queue.files[0];
  if (!file) return;
  if (pw.value.length < 4) { status('Use a password of at least 4 characters.', true); return; }
  if (pw.value !== pw2.value) { status('The two passwords do not match.', true); return; }
  go.disabled = true;
  try {
    status('Loading the encryption engine (first use downloads it once)…');
    const input = new Uint8Array(await file.arrayBuffer());
    const out = await runQpdf(input, ['--encrypt', pw.value, pw.value, '256', '--', '/in.pdf', '/out.pdf']);
    saveBlob(new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-protected.pdf');
    status('Done — your PDF is encrypted with AES-256. Anyone opening it needs the password. It never left your device.');
  } catch (err) {
    status(err instanceof Error ? err.message : 'Encryption failed for this file.', true);
  } finally { go.disabled = queue.files.length === 0; }
});
