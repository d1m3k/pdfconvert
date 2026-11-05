// qpdf (WebAssembly) runner for Protect / Unlock.
//
// The @jspawn/qpdf-wasm Emscripten build does not survive Vite bundling (its
// ESM wrapper loses the factory — "createModule is not defined"). So the glue
// is served unbundled from /vendor/qpdf.js (a copy of the npm package file)
// and loaded as a classic script, the environment it was written for.
// The .wasm binary itself (1.27 MB) cannot travel through this repo's
// text-only push channel, so it is loaded from the jsDelivr CDN copy of the
// exact same npm package file — SHA-256 verified byte-identical to the local
// build (cbd81a24…). It is a public library binary, like any JS dependency:
// user files and passwords still never leave the tab. When the site moves to
// its own infrastructure, self-host qpdf.wasm under /vendor/ and point
// WASM_URL at it.
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
let factoryPromise: Promise<any> | null = null;

function loadFactory(): Promise<any> {
  if (!factoryPromise) {
    factoryPromise = new Promise((resolve, reject) => {
      const w = window as any;
      if (typeof w.Module === 'function') { resolve(w.Module); return; }
      const s = document.createElement('script');
      s.src = `${base}vendor/qpdf.js`;
      s.onload = () => (typeof w.Module === 'function'
        ? resolve(w.Module)
        : reject(new Error('The encryption engine loaded but did not initialise.')));
      s.onerror = () => reject(new Error('The encryption engine failed to load. Check your connection and try again.'));
      document.head.appendChild(s);
    });
  }
  return factoryPromise;
}

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@jspawn/qpdf-wasm@0.0.2/qpdf.wasm';

export async function runQpdf(input: Uint8Array, args: string[]): Promise<Uint8Array> {
  const factory = await loadFactory();
  const qpdf = await factory({
    locateFile: (p: string) => (p.endsWith('.wasm') ? WASM_URL : p),
  });
  qpdf.FS.writeFile('/in.pdf', input);
  let code: number | null = null;
  try {
    code = qpdf.callMain(args);
  } catch {
    // Emscripten builds sometimes throw on exit even after success — the output
    // file check below is the real verdict.
  }
  let out: Uint8Array;
  try {
    out = qpdf.FS.readFile('/out.pdf') as Uint8Array;
  } catch {
    throw new Error(`qpdf could not process this file (exit ${code}). It may be corrupted, or the password is wrong.`);
  }
  if (!out || out.length === 0) throw new Error('qpdf produced no output. The password may be wrong.');
  return out;
}
