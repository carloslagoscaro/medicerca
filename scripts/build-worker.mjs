import { build } from 'esbuild';

await build({
  entryPoints: ['worker/index.js'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  outfile: 'cloudflare-worker.js',
  banner: {
    js: '// Archivo generado por scripts/build-worker.mjs. No editar a mano.'
  },
  legalComments: 'none',
  logLevel: 'info'
});
