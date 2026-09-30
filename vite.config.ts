import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Gera um único dist/index.html autocontido: o jogo abre com duplo clique, sem servidor.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2022' },
});
