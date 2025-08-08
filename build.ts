import { $ } from 'bun'

await $`tsc --project tsconfig.dts.json`
await $`rm -rf dist/*.ts`
await $`cp dist/src/*.d.ts dist/ && rm -rf dist/src`

await Bun.build({
    entrypoints: ['./src/main.ts'],
    outdir: './dist',
    minify: {
        whitespace: true,
        syntax: true,
    },
    target: 'bun',
    sourcemap: 'linked',
})

process.exit()
