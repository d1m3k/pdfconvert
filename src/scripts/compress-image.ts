import JSZip from 'jszip';
import { createQueue, saveBlob, statusSetter, fmtSize } from './workbench';

const zone = document.getElementById('dz')!;
const input = document.getElementById('file') as HTMLInputElement;
const list = document.getElementById('filelist')!;
const go = document.getElementById('go') as HTMLButtonElement;
const status = statusSetter(document.getElementById('status')!);
const quality = document.getElementById('quality') as HTMLInputElement;
const qval = document.getElementById('qval')!;
const formatSel = document.getElementById('format') as HTMLSelectElement;
const maxDimSel = document.getElementById('maxdim') as HTMLSelectElement;
const results = document.getElementById('results')!;

quality.addEventListener('input', () => { qval.textContent = `${quality.value}%`; });

const queue = createQueue({
  zone, input, list,
  accept: (f) => f.type.startsWith('image/'),
  rejectMessage: 'only image files are accepted here.',
  status,
  onChange: (files) => {
    go.disabled = files.length === 0;
    status(files.length === 0 ? 'Add one or more images to compress.'
      : `${files.length} image(s) ready to compress.`);
  },
});

interface Done { name: string; blob: Blob; before: number }
let doneItems: Done[] = [];

function renderResults() {
  results.innerHTML = '';
  for (const item of doneItems) {
    const row = document.createElement('div');
    row.className = 'result';
    const grow = document.createElement('span');
    grow.className = 'grow';
    grow.textContent = item.name;
    const saved = item.before > 0 ? Math.max(0, Math.round((1 - item.blob.size / item.before) * 100)) : 0;
    const meta = document.createElement('span');
    meta.className = 'savings';
    meta.textContent = `${fmtSize(item.before)} → ${fmtSize(item.blob.size)} (−${saved}%)`;
    const dl = document.createElement('button');
    dl.className = 'btn small';
    dl.textContent = 'Download';
    dl.onclick = () => saveBlob(item.blob, item.name);
    row.append(grow, meta, dl);
    results.appendChild(row);
  }
  if (doneItems.length > 1) {
    const zipBtn = document.createElement('button');
    zipBtn.className = 'btn ghost small';
    zipBtn.textContent = `Download all ${doneItems.length} as ZIP`;
    zipBtn.onclick = async () => {
      const zip = new JSZip();
      doneItems.forEach((d) => zip.file(d.name, d.blob));
      const blob = await zip.generateAsync({ type: 'blob' });
      saveBlob(blob, 'compressed-images.zip');
    };
    results.appendChild(zipBtn);
  }
}

async function compressOne(file: File): Promise<Done> {
  const fmtChoice = formatSel.value; // keep | image/jpeg | image/webp
  const outType = fmtChoice === 'keep' ? (file.type === 'image/png' ? 'image/png' : file.type || 'image/jpeg') : fmtChoice;
  const maxDim = Number(maxDimSel.value); // 0 = original
  const bmp = await createImageBitmap(file);
  let w = bmp.width, h = bmp.height;
  if (maxDim > 0 && Math.max(w, h) > maxDim) {
    const s = maxDim / Math.max(w, h);
    w = Math.round(w * s); h = Math.round(h * s);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  if (outType === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(bmp, 0, 0, w, h);
  const q = outType === 'image/png' ? undefined : Number(quality.value) / 100;
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), outType, q));
  const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg';
  const base = file.name.replace(/\.[^.]+$/, '');
  return { name: `${base}-compressed.${ext}`, blob, before: file.size };
}

go.addEventListener('click', async () => {
  const files = [...queue.files];
  if (files.length === 0) return;
  go.disabled = true;
  doneItems = [];
  renderResults();
  try {
    for (let i = 0; i < files.length; i++) {
      status(`Compressing ${i + 1} of ${files.length}: ${files[i].name}…`);
      doneItems.push(await compressOne(files[i]));
      renderResults();
    }
    const before = doneItems.reduce((s, d) => s + d.before, 0);
    const after = doneItems.reduce((s, d) => s + d.blob.size, 0);
    status(`Done — ${fmtSize(before)} became ${fmtSize(after)} across ${doneItems.length} image(s). Everything ran on your device.`);
  } catch (err) {
    console.error(err);
    status('One of the images could not be processed. Try a JPG, PNG or WebP copy of it.', true);
  } finally {
    go.disabled = queue.files.length === 0;
  }
});
