import { createQueue, saveBlob, statusSetter, fmtSize } from './workbench';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const stage = document.getElementById('stage') as HTMLCanvasElement;
const ratioSel = document.getElementById('ratio') as HTMLSelectElement;
const results = document.getElementById('results')!;

let img: ImageBitmap | null = null;
let srcFile: File | null = null;
let sel: { x: number; y: number; w: number; h: number } | null = null; // stage pixels
let dragStart: { x: number; y: number } | null = null;

function draw() {
  if (!img) return;
  const ctx = stage.getContext('2d')!;
  ctx.clearRect(0, 0, stage.width, stage.height);
  ctx.drawImage(img, 0, 0, stage.width, stage.height);
  if (sel) {
    ctx.fillStyle = 'rgba(22,19,14,0.45)';
    ctx.fillRect(0, 0, stage.width, sel.y);
    ctx.fillRect(0, sel.y + sel.h, stage.width, stage.height - sel.y - sel.h);
    ctx.fillRect(0, sel.y, sel.x, sel.h);
    ctx.fillRect(sel.x + sel.w, sel.y, stage.width - sel.x - sel.w, sel.h);
    ctx.strokeStyle = '#FF4D00'; ctx.lineWidth = 2.5;
    ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
  }
}

const stagePos = (e: PointerEvent) => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) * (stage.width / r.width), y: (e.clientY - r.top) * (stage.height / r.height) }; };
stage.addEventListener('pointerdown', (e) => { if (!img) return; dragStart = stagePos(e); sel = { ...dragStart, w: 0, h: 0 }; stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', (e) => {
  if (!dragStart || !img) return;
  const p = stagePos(e);
  let w = p.x - dragStart.x, h = p.y - dragStart.y;
  const ratio = Number(ratioSel.value);
  if (ratio > 0) { h = Math.sign(h) * Math.abs(w) / ratio; }
  sel = { x: w < 0 ? dragStart.x + w : dragStart.x, y: h < 0 ? dragStart.y + h : dragStart.y, w: Math.abs(w), h: Math.abs(h) };
  draw();
  go.disabled = !(sel.w > 8 && sel.h > 8);
});
stage.addEventListener('pointerup', () => {
  dragStart = null;
  if (sel && img) {
    const sx = img.width / stage.width, sy = img.height / stage.height;
    status(`Selection: ${Math.round(sel.w * sx)}×${Math.round(sel.h * sy)} px of the original. Press Crop & download.`);
  }
});

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type.startsWith('image/'),
  rejectMessage: 'only image files are accepted here.',
  status,
  onChange: async (files) => {
    go.disabled = true; sel = null; results.innerHTML = '';
    if (!files.length) { status('Add an image to crop.'); img = null; return; }
    srcFile = files[0];
    img = await createImageBitmap(srcFile);
    const maxW = 760;
    const s = Math.min(1, maxW / img.width);
    stage.width = Math.round(img.width * s); stage.height = Math.round(img.height * s);
    draw();
    status(`${srcFile.name} is ${img.width}×${img.height}px (${fmtSize(srcFile.size)}). Drag on the image to select the crop area.`);
  },
});

go.addEventListener('click', async () => {
  if (!img || !sel || !srcFile) return;
  go.disabled = true;
  try {
    const sx = img.width / stage.width, sy = img.height / stage.height;
    const ox = Math.round(sel.x * sx), oy = Math.round(sel.y * sy);
    const ow = Math.round(sel.w * sx), oh = Math.round(sel.h * sy);
    const canvas = document.createElement('canvas');
    canvas.width = ow; canvas.height = oh;
    const ctx = canvas.getContext('2d')!;
    const outType = srcFile.type === 'image/png' || srcFile.type === 'image/webp' ? srcFile.type : 'image/jpeg';
    if (outType === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, ow, oh); }
    ctx.drawImage(img, ox, oy, ow, oh, 0, 0, ow, oh);
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), outType, 0.92));
    const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg';
    const name = `${srcFile.name.replace(/\.[^.]+$/, '')}-cropped.${ext}`;
    saveBlob(blob, name);
    status(`Done — cropped to ${ow}×${oh}px and downloaded as ${name}. It never left your device.`);
  } catch { status('Cropping failed for this image. Try a JPG, PNG or WebP copy.', true); }
  finally { go.disabled = !(sel && sel.w > 8); }
});
