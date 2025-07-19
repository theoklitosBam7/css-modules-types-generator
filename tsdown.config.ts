import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['./src/{index,run}.ts'],
    platform: 'node',
    dts: true,
    outDir: 'dist',
    onSuccess() {
      console.info('✨ Build succeeded!')
    },
  },
])
