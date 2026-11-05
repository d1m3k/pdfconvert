import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { createQueue, saveBlob, statusSetter } from './workbench';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const textInput = document.getElementById('wmtext') as HTMLInputElement;
const opacitySel = document.getElementById('opacity') as HTMLSelectElement;
const sizeSel = document.getElementById('size') as HTMLSelectElement;

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  status,
  onChange: (files) => { go.disabled = files.length === 0; status(files.length ? `${files[0].name} ready. Type the watermark text.` : 'Add a PDF file to watermark.'); },
});

go.addEventListener('click', async () => {
  const file = queue.files[0];
  if (!file) return;
  const text = textInput.value.trim();
  if (!text) { status('Type the watermark text first.', true); return; }
  go.disabled = true;
  try {
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const size = Number(sizeSel.value);
    const opacity = Number(opacitySel.value);
    const w = font.widthOfTextAtSize(text, size);
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: (width - w * Math.cos(Math.PI / 4)) / 2,
        y: height / 2 - w * Math.sin(Math.PI / 4) / 2,
        size, font, color: rgb(0.45, 0.45, 0.48), opacity, rotate: degrees(45),
      });
    }
    const out = await doc.save();
    saveBlob(new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-watermarked.pdf');
    status(`Done — “${text}” stamped diagonally on all ${doc.getPageCount()} page(s). It never left your device.`);
  } catch { status('That PDF could not be processed — it may be corrupted or password-protected.', true); }
  finally { go.disabled = queue.files.length === 0; }
});
