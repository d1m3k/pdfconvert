import { PDFDocument } from 'pdf-lib';
import { createQueue, saveBlob, statusSetter, fmtSize } from './workbench';

const zone = document.getElementById('dz')!;
const input = document.getElementById('file') as HTMLInputElement;
const list = document.getElementById('filelist')!;
const go = document.getElementById('go') as HTMLButtonElement;
const status = statusSetter(document.getElementById('status')!);
const pageSizeSel = document.getElementById('pagesize') as HTMLSelectElement;
const marginSel = document.getElementById('margin') as HTMLSelectElement;

const isImage = (f: File) => f.type.startsWith('image/');

const queue = createQueue({
  zone, input, list,
  accept: isImage,
  rejectMessage: 'only image files are accepted here.',
  reorder: true,
  status,
  onChange: (files) => {
    go.disabled = files.length === 0;
    status(files.length === 0 ? 'Add one or more images to build a PDF.'
      : `${files.length} image(s) queued — page order follows the list from top to bottom.`);
  },
});

// Anything the browser can decode that is not JPG/PNG is re-encoded to PNG via canvas,
// because pdf-lib embeds JPG and PNG natively.
async function embedAny(pdf: PDFDocument, file: File) {
  const bytes = await file.arrayBuffer();
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') return pdf.embedJpg(bytes);
  if (file.type === 'image/png') return pdf.embedPng(bytes);
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width; canvas.height = bmp.height;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0);
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  return pdf.embedPng(await blob.arrayBuffer());
}

go.addEventListener('click', async () => {
  const files = queue.files;
  if (files.length === 0) return;
  go.disabled = true;
  try {
    const pdf = await PDFDocument.create();
    const margin = Number(marginSel.value); // points
    const A4: [number, number] = [595.28, 841.89];
    for (let i = 0; i < files.length; i++) {
      status(`Placing image ${i + 1} of ${files.length}: ${files[i].name}…`);
      const img = await embedAny(pdf, files[i]);
      let pageW: number, pageH: number;
      if (pageSizeSel.value === 'fit') { pageW = img.width + margin * 2; pageH = img.height + margin * 2; }
      else {
        const landscape = img.width > img.height;
        [pageW, pageH] = landscape ? [A4[1], A4[0]] : A4;
      }
      const page = pdf.addPage([pageW, pageH]);
      const availW = pageW - margin * 2, availH = pageH - margin * 2;
      const scale = Math.min(availW / img.width, availH / img.height);
      const w = img.width * scale, h = img.height * scale;
      page.drawImage(img, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
    }
    status('Building your PDF…');
    const out = await pdf.save();
    saveBlob(new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' }), 'images.pdf');
    status(`Done — ${files.length} image(s) became a ${files.length}-page PDF (${fmtSize(out.length)}). It never left your device.`);
  } catch (err) {
    console.error(err);
    status('One of the images could not be read. It may be an unsupported format — try a JPG or PNG copy of it.', true);
  } finally {
    go.disabled = queue.files.length === 0;
  }
});
