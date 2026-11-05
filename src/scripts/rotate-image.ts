import { createQueue, saveBlob, statusSetter, fmtSize } from './workbench';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const stage = document.getElementById('stage') as HTMLCanvasElement;

let img: ImageBitmap | null = null;
let srcFile: File | null = null;
let rot = 0; // clockwise degrees
let flipH = false, flipV = false;

function draw() {
  if (!img) return;
  const swapped = rot % 180 !== 0;
  const w = swapped ? img.height : img.width;
  const h = swapped ? img.width : img.height;
  const s = Math.min(1, 760 / w, 560 / h);
  stage.width = Math.round(w * s); stage.height = Math.round(h * s);
  const ctx = stage.getContext('2d')!;
  ctx.clearRect(0, 0, stage.width, stage.height);
  ctx.save();
  ctx.translate(stage.width / 2, stage.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale((flipH ? -1 : 1) * s, (flipV ? -1 : 1) * s);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
  go.disabled = false;
  status(`Rotation ${rot}°${flipH ? ' · flipped horizontally' : ''}${flipV ? ' · flipped vertically' : ''}. Download when it looks right.`);
}

const bind = (id: string, fn: () => void) => document.getElementById(id)!.addEventListener('click', () => { if (img) { fn(); draw(); } });
bind('rotl', () => { rot = (rot + 270) % 360; });
bind('rotr', () => { rot = (rot + 90) % 360; });
bind('fliph', () => { flipH = !flipH; });
bind('flipv', () => { flipV = !flipV; });

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type.startsWith('image/'),
  rejectMessage: 'only image files are accepted here.',
  status,
  onChange: async (files) => {
    go.disabled = true;
    if (!files.length) { status('Add an image to rotate or flip.'); img = null; return; }
    srcFile = files[0];
    rot = 0; flipH = false; flipV = false;
    img = await createImageBitmap(srcFile);
    status(`${srcFile.name} is ${img.width}×${img.height}px (${fmtSize(srcFile.size)}). Use the buttons to turn or mirror it.`);
    draw();
  },
});

go.addEventListener('click', async () => {
  if (!img || !srcFile) return;
  go.disabled = true;
  try {
    const swapped = rot % 180 !== 0;
    const canvas = document.createElement('canvas');
    canvas.width = swapped ? img.height : img.width;
    canvas.height = swapped ? img.width : img.height;
    const ctx = canvas.getContext('2d')!;
    const outType = srcFile.type === 'image/png' || srcFile.type === 'image/webp' ? srcFile.type : 'image/jpeg';
    if (outType === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), outType, 0.95));
    const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg';
    saveBlob(blob, `${srcFile.name.replace(/\.[^.]+$/, '')}-rotated.${ext}`);
    status(`Done — saved at full resolution (${canvas.width}×${canvas.height}px). It never left your device.`);
  } catch { status('That image could not be processed. Try a JPG, PNG or WebP copy.', true); }
  finally { go.disabled = !img; }
});
