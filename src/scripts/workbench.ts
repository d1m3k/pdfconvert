// Shared workbench helpers for every tool page: dropzone binding, a removable /
// reorderable file queue, size formatting and blob download. One engine, many tools.

export function fmtSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export interface Queue {
  files: File[];
  clear(): void;
}

interface QueueOpts {
  zone: HTMLElement;
  input: HTMLInputElement;
  list: HTMLElement;
  accept: (f: File) => boolean;
  rejectMessage: string;
  reorder?: boolean;
  onChange: (files: File[]) => void;
  status: (msg: string, isError?: boolean) => void;
}

export function createQueue(opts: QueueOpts): Queue {
  const files: File[] = [];

  const render = () => {
    opts.list.innerHTML = '';
    files.forEach((f, idx) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'fname';
      name.textContent = f.name;
      const size = document.createElement('span');
      size.className = 'fsize';
      size.textContent = fmtSize(f.size);
      li.append(name, size);
      if (opts.reorder) {
        const up = document.createElement('button');
        up.textContent = '↑';
        up.title = 'Move up';
        up.disabled = idx === 0;
        up.onclick = () => { [files[idx - 1], files[idx]] = [files[idx], files[idx - 1]]; render(); opts.onChange(files); };
        const down = document.createElement('button');
        down.textContent = '↓';
        down.title = 'Move down';
        down.disabled = idx === files.length - 1;
        down.onclick = () => { [files[idx + 1], files[idx]] = [files[idx], files[idx + 1]]; render(); opts.onChange(files); };
        li.append(up, down);
      }
      const rm = document.createElement('button');
      rm.textContent = '✕';
      rm.title = 'Remove';
      rm.onclick = () => { files.splice(idx, 1); render(); opts.onChange(files); };
      li.append(rm);
      opts.list.appendChild(li);
    });
  };

  const add = (incoming: FileList | File[]) => {
    let rejected = 0;
    for (const f of Array.from(incoming)) {
      if (opts.accept(f)) files.push(f); else rejected++;
    }
    if (rejected > 0) opts.status(`${rejected} file(s) skipped — ${opts.rejectMessage}`, true);
    render();
    opts.onChange(files);
  };

  opts.zone.addEventListener('click', () => opts.input.click());
  opts.input.addEventListener('change', () => { if (opts.input.files) add(opts.input.files); opts.input.value = ''; });
  for (const ev of ['dragenter', 'dragover']) opts.zone.addEventListener(ev, (e) => { e.preventDefault(); opts.zone.classList.add('drag'); });
  for (const ev of ['dragleave', 'drop']) opts.zone.addEventListener(ev, (e) => { e.preventDefault(); opts.zone.classList.remove('drag'); });
  opts.zone.addEventListener('drop', (e) => { const dt = (e as DragEvent).dataTransfer; if (dt?.files) add(dt.files); });

  return { files, clear() { files.length = 0; render(); opts.onChange(files); } };
}

export function statusSetter(el: HTMLElement) {
  return (msg: string, isError = false) => {
    el.textContent = msg;
    el.classList.toggle('err', isError);
  };
}
