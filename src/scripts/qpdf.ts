// qpdf (WebAssembly) runner for Protect / Unlock. The wasm binary is bundled by
// Vite and fetched from our own origin — the user's file still never leaves the device.
import wasmUrl from '@jspawn/qpdf-wasm/qpdf.wasm?url';

export async function runQpdf(input: Uint8Array, args: string[]): Promise<Uint8Array> {
  const { default: createQpdf } = await import('@jspawn/qpdf-wasm');
  const qpdf = await createQpdf({ locateFile: (p: string) => (p.endsWith('.wasm') ? wasmUrl : p) });
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
