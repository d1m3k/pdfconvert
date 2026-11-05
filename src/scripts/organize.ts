import { PDFDocument, degrees } from 'pdf-lib';
import { createQueue, saveBlob, statusSetter } from './workbench';
import { getPdfjs } from './pdfjs';

const status = statusSetter(document.getElementById('status')!);
const go = document.getElementById('go') as HTMLButtonElement;
const thumbs = document.getElementById('thumbs')!;

interface PageState { srcIndex: number; rot: number; deleted: boolean; }
let order: PageState[] = [];
let srcBytes: ArrayBuffer | null = null;
let srcName = 'document';

function renderThumbs(canvases: Map<number, HTMLCanvasElement>) {
  thumbs.innerHTML = '';
  order.forEach((st, pos) => {
    const card = document.createElement('div');
    card.className = 'thumb' + (st.deleted ? ' off' : '');
    const c = canvases.get(st.srcIndex)!;
    const view = document.createElement('canvas');
    const scale = 132 / c.width;
    view.width = 132; view.height = Math.round(c.height * scale);
    if (st.rot % 180 !== 0) { view.width = 132; view.height = Math.round(c.width * scale * (132 / Math.max(1, Math.round(c.width * scale))) ); view.width = Math.round(132 * (c.height / c.width)) > 132 ? 132 : Math.round(132 * (c.height / c.width)); view.height = Math.round(view.width * (c.width / c.height)); }
    const vctx = view.getContext('2d')!;
    vctx.save();
    vctx.translate(view.width / 2, view.height / 2);
    vctx.rotate((st.rot * Math.PI) / 180);
    const dw = st.rot % 180 === 0 ? view.width : view.height;
    const dh = st.rot % 180 === 0 ? view.height : view.width;
    vctx.drawImage(c, -dw / 2, -dh / 2, dw, dh);
    vctx.restore();
    const bar = document.createElement('div');
    bar.className = 'tbar';
    const no = document.createElement('span');
    no.className = 'pno';
    no.textContent = `p.${st.srcIndex + 1}`;
    const mk = (label: string, title: string, fn: () => void) => { const b = document.createElement('button'); b.textContent = label; b.title = title; b.onclick = () => { fn(); renderThumbs(canvases); }; return b; };
    bar.append(no,
      mk('←', 'Move earlier', () => { if (pos > 0) { [order[pos - 1], order[pos]] = [order[pos], order[pos - 1]]; } }),
      mk('→', 'Move later', () => { if (pos < order.length - 1) { [order[pos + 1], order[pos]] = [order[pos], order[pos + 1]]; } }),
      mk('⟳', 'Rotate 90°', () => { st.rot = (st.rot + 90) % 360; }),
      mk(st.deleted ? '↩' : '✕', st.deleted ? 'Restore page' : 'Delete page', () => { st.deleted = !st.deleted; }));
    card.append(view, bar);
    thumbs.appendChild(card);
  });
  const kept = order.filter(s => !s.deleted).length;
  go.disabled = kept === 0;
  status(kept === 0 ? 'Every page is marked for deletion — restore at least one page.' : `${kept} of ${order.length} pages will be kept, in the order shown.`);
}

const queue = createQueue({
  zone: document.getElementById('dz')!, input: document.getElementById('file') as HTMLInputElement, list: document.getElementById('filelist')!,
  accept: (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
  rejectMessage: 'only PDF files are accepted here.',
  status,
  onChange: async (files) => {
    thumbs.innerHTML = ''; order = []; go.disabled = true;
    if (files.length === 0) { status('Add a PDF file to organize.'); return; }
    try {
      status('Rendering page thumbnails…');
      srcBytes = await files[0].arrayBuffer();
      srcName = files[0].name.replace(/\.pdf$/i, '');
      const pdfjs = await getPdfjs();
      const doc = await pdfjs.getDocument({ data: srcBytes.slice(0) }).promise;
      const canvases = new Map<number, HTMLCanvasElement>();
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 0.35 });
        const c = document.createElement('canvas');
        c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
        canvases.set(i - 1, c);
        order.push({ srcIndex: i - 1, rot: 0, deleted: false });
      }
      renderThumbs(canvases);
      (go as any)._canvases = canvases;
    } catch { status('That PDF could not be rendered — it may be corrupted or password-protected.', true); }
  },
});

go.addEventListener('click', async () => {
  if (!srcBytes) return;
  go.disabled = true;
  try {
    status('Building your reorganized PDF…');
    const src = await PDFDocument.load(srcBytes.slice(0), { ignoreEncryption: true });
    const out = await PDFDocument.create();
    const kept = order.filter(s => !s.deleted);
    const copied = await out.copyPages(src, kept.map(s => s.srcIndex));
    copied.forEach((p, i) => {
      const extra = kept[i].rot;
      if (extra) p.setRotation(degrees((p.getRotation().angle + extra) % 360));
      out.addPage(p);
    });
    const bytes = await out.save();
    saveBlob(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }), `${srcName}-organized.pdf`);
    status(`Done — ${kept.length} page(s) saved in your new order. It never left your device.`);
  } catch { status('Building the PDF failed. Try again with a fresh copy of the file.', true); }
  finally { go.disabled = order.filter(s => !s.deleted).length === 0; }
});
