import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import tailwindShadowDOM from 'vite-plugin-tailwind-shadowdom';
import { isProduction, resolveOptions } from './vite.shared';

export default defineConfig(({ mode }) => ({
	plugins: [react(), tailwindcss(), tailwindShadowDOM()],
	resolve: resolveOptions,
	build: {
		rolldownOptions: {
			input: resolve(__dirname, 'src/services/content/main.ts'),
			output: {
				entryFileNames: 'main.js',
				codeSplitting: false,
			},
		},
		outDir: 'dist/content-scripts',
		emptyOutDir: false,
		copyPublicDir: false,
		minify: isProduction(mode) ? 'oxc' : false,
		sourcemap: !isProduction(mode),
		watch: isProduction(mode) ? null : { include: 'src/**', exclude: 'node_modules/**' },
	},
}));
