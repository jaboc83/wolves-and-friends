// Build-time measurement only; never shipped to the browser or used for telemetry.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
function assets(root) {
  const files = [];
  function visit(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) visit(file);
      else if (file.endsWith('.js')) {
        const bytes = fs.readFileSync(file);
        files.push({ file: path.relative(root, file), bytes: bytes.length, gzip: gzipSync(bytes).length });
      }
    }
  }
  visit(root);
  return { bytes: files.reduce((n, f) => n + f.bytes, 0), gzip: files.reduce((n, f) => n + f.gzip, 0),
    files: files.sort((a, b) => b.bytes - a.bytes).slice(0, 8) };
}
const base = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(base || '')) throw Error('Expected pinned base commit');
const current = assets('dist/client');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wolves-client-baseline-'));
try {
  execFileSync('git', ['fetch', '--depth=1', 'origin', base], { stdio: 'pipe' });
  const archive = execFileSync('git', ['archive', base], { maxBuffer: 64 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', directory], { input: archive });
  fs.symlinkSync(path.resolve('node_modules'), path.join(directory, 'node_modules'), 'dir');
  execFileSync('pnpm', ['build'], { cwd: directory, stdio: 'pipe', maxBuffer: 16 * 1024 * 1024 });
  const previous = assets(path.join(directory, 'dist/client'));
  console.log(JSON.stringify({ base, previous, current,
    note: 'All client JavaScript assets, including lazy chunks. This measures build output, not browser load timing or initial-route transfer.' }, null, 2));
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally { fs.rmSync(directory, { recursive: true, force: true }); }
