import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { isProduction, resolveOptions } from './vite.shared';

export default defineConfig(({ mode }) => ({
	plugins: [react(), tailwindcss()],
	root: 'src',
	resolve: resolveOptions,
	build: {
		rolldownOptions: {
			input: resolve(__dirname, 'src/ui/pages/main/index.html'),
			output: {
				entryFileNames: 'sidepanel.js',
				chunkFileNames: 'ui/chunks/sidepanel-[hash].js',
				assetFileNames: 'ui/assets/sidepanel-[name]-[hash][extname]',
				codeSplitting: isProduction(mode)
					? {
							groups: [
								{
									name: 'lib/chunk',
									test: /node_modules/,
									minSize: 100000, // 100KB
									maxSize: 500000, // 500KB
									priority: 10,
								},
							],
						}
					: true,
			},
		},
		outDir: `../${isProduction(mode) ? 'dist' : 'build'}`,
		emptyOutDir: false,
		copyPublicDir: false,
		minify: isProduction(mode) ? 'oxc' : false,
		sourcemap: !isProduction(mode),
		watch: isProduction(mode) ? null : { include: 'src/**' },
	},
	envDir: '..',
}));
