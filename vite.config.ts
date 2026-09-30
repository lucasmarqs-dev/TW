import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Gera um único dist/index.html autocontido: o jogo abre com duplo clique, sem servidor.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  // Sprites WebP são embutidos como data URI para manter o arquivo único.
  build: { target: 'es2022', assetsInlineLimit: 100_000_000 },
});
