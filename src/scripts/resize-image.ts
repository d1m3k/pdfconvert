import { createQueue, saveBlob, statusSetter, fmtSize } from './workbench';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const wIn = document.getElementById('w') as HTMLInputElement;
const hIn = document.getElementById('h') as HTMLInputElement;
const lock = document.getElementById('lock') as HTMLInputElement;
const pctSel = document.getElementById('pct') as HTMLSelectElement;
const results = document.getElementById('results')!;

let orig: { w: number; h: number } | null = null;
let srcFile: File | null = null;

function syncFrom(changed: 'w' | 'h') {
  if (!orig || !lock.checked) return;
  if (changed === 'w' && Number(wIn.value) > 0) hIn.value = String(Math.max(1, Math.round(Number(wIn.value) * orig.h / orig.w)));
  if (changed === 'h' && Number(hIn.value) > 0) wIn.value = String(Math.max(1, Math.round(Number(hIn.value) * orig.w / orig.h)));
}
wIn.addEventListener('input', () => syncFrom('w'));
hIn.addEventListener('input', () => syncFrom('h'));
pctSel.addEventListener('change', () => {
  if (!orig) return;
  const p = Number(pctSel.value);
  if (p > 0) { wIn.value = String(Math.max(1, Math.round(orig.w * p / 100))); hIn.value = String(Math.max(1, Math.round(orig.h * p / 100))); }
});

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type.startsWith('image/'),
  rejectMessage: 'only image files are accepted here.',
  status,
  onChange: async (files) => {
    go.disabled = files.length === 0;
    results.innerHTML = '';
    if (!files.length) { status('Add an image to resize.'); orig = null; return; }
    srcFile = files[0];
    const bmp = await createImageBitmap(srcFile);
    orig = { w: bmp.width, h: bmp.height };
    wIn.value = String(orig.w); hIn.value = String(orig.h);
    status(`${srcFile.name} is ${orig.w}×${orig.h}px (${fmtSize(srcFile.size)}). Set the new size.`);
  },
});

go.addEventListener('click', async () => {
  if (!srcFile || !orig) return;
  const w = Number(wIn.value), h = Number(hIn.value);
  if (!(w > 0 && h > 0)) { status('Enter a width and height above zero.', true); return; }
  go.disabled = true;
  try {
    const bmp = await createImageBitmap(srcFile);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const outType = srcFile.type === 'image/png' || srcFile.type === 'image/webp' ? srcFile.type : 'image/jpeg';
    if (outType === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), outType, 0.92));
    const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg';
    const name = `${srcFile.name.replace(/\.[^.]+$/, '')}-${w}x${h}.${ext}`;
    results.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'result';
    const grow = document.createElement('span'); grow.className = 'grow'; grow.textContent = `${name} · ${w}×${h}px`;
    const meta = document.createElement('span'); meta.className = 'savings'; meta.textContent = `${fmtSize(srcFile.size)} → ${fmtSize(blob.size)}`;
    const dl = document.createElement('button'); dl.className = 'btn small'; dl.textContent = 'Download';
    dl.onclick = () => saveBlob(blob, name);
    row.append(grow, meta, dl);
    results.appendChild(row);
    status(`Done — resized to ${w}×${h}px. It never left your device.`);
  } catch { status('That image could not be resized. Try a JPG, PNG or WebP copy.', true); }
  finally { go.disabled = queue.files.length === 0; }
});
