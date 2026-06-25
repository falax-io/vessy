import { build } from 'esbuild'

await build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/cli.cjs',
  external: [],
})

console.log('Built dist/cli.cjs')
