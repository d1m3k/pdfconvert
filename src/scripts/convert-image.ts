import JSZip from 'jszip';
import { createQueue, saveBlob, statusSetter, fmtSize } from './workbench';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const formatSel = document.getElementById('format') as HTMLSelectElement;
const quality = document.getElementById('quality') as HTMLInputElement;
const qval = document.getElementById('qval')!;
const results = document.getElementById('results')!;
quality.addEventListener('input', () => { qval.textContent = `${quality.value}%`; });

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type.startsWith('image/'),
  rejectMessage: 'only image files are accepted here.',
  status,
  onChange: (files) => { go.disabled = files.length === 0; status(files.length ? `${files.length} image(s) ready to convert.` : 'Add one or more images to convert.'); },
});

go.addEventListener('click', async () => {
  const files = [...queue.files];
  if (!files.length) return;
  go.disabled = true;
  results.innerHTML = '';
  const outType = formatSel.value;
  const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg';
  const made: { name: string; blob: Blob }[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      status(`Converting ${i + 1} of ${files.length}: ${files[i].name}…`);
      const bmp = await createImageBitmap(files[i]);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width; canvas.height = bmp.height;
      const ctx = canvas.getContext('2d')!;
      if (outType === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(bmp, 0, 0);
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), outType, outType === 'image/png' ? undefined : Number(quality.value) / 100));
      const item = { name: `${files[i].name.replace(/\.[^.]+$/, '')}.${ext}`, blob };
      made.push(item);
      const row = document.createElement('div');
      row.className = 'result';
      const grow = document.createElement('span'); grow.className = 'grow'; grow.textContent = item.name;
      const meta = document.createElement('span'); meta.className = 'savings'; meta.textContent = `${fmtSize(files[i].size)} → ${fmtSize(blob.size)}`;
      const dl = document.createElement('button'); dl.className = 'btn small'; dl.textContent = 'Download';
      dl.onclick = () => saveBlob(item.blob, item.name);
      row.append(grow, meta, dl);
      results.appendChild(row);
    }
    if (made.length > 1) {
      const zipBtn = document.createElement('button');
      zipBtn.className = 'btn ghost small';
      zipBtn.textContent = `Download all ${made.length} as ZIP`;
      zipBtn.onclick = async () => { const zip = new JSZip(); made.forEach(m => zip.file(m.name, m.blob)); saveBlob(await zip.generateAsync({ type: 'blob' }), 'converted-images.zip'); };
      results.appendChild(zipBtn);
    }
    status(`Done — ${made.length} image(s) converted to ${ext.toUpperCase()}. It never left your device.`);
  } catch { status('One of the images could not be converted. Try a JPG, PNG or WebP copy of it.', true); }
  finally { go.disabled = queue.files.length === 0; }
});
