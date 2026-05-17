import { resolve } from 'path';
import { defineConfig } from 'vite';
import { isProduction, resolveOptions } from './vite.shared';

export default defineConfig(({ mode }) => ({
	plugins: [],
	resolve: resolveOptions,
	build: {
		rolldownOptions: {
			input: resolve(__dirname, 'src/services/content/insider.ts'),
			output: {
				entryFileNames: 'insider.js',
				codeSplitting: false,
			},
		},
		outDir: 'dist/content-scripts',
		emptyOutDir: false,
		copyPublicDir: false,
		minify: isProduction(mode) ? 'oxc' : false,
		sourcemap: !isProduction(mode),
		watch: isProduction(mode) ? null : { include: 'src/**' },
	},
}));
