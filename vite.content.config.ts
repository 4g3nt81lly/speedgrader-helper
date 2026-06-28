import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import tailwindShadowDOM from 'vite-plugin-tailwind-shadowdom';
import { hotReloadExtension, isProduction, resolveOptions } from './vite.shared';

export default defineConfig(({ mode }) => ({
	plugins: [
		react(),
		tailwindcss(),
		tailwindShadowDOM(),
		hotReloadExtension(function (socket) {
			this.info('Reloading extension and active tab...');
			socket.emit('hr', 'reload');
			socket.emit('hr', 'reloadActiveTabs');
		}),
	],
	resolve: resolveOptions,
	build: {
		rolldownOptions: {
			input: resolve(__dirname, 'src/services/content/main.ts'),
			output: {
				entryFileNames: 'main.js',
				codeSplitting: false,
			},
		},
		outDir: `${isProduction(mode) ? 'dist' : 'build'}/content-scripts`,
		emptyOutDir: false,
		copyPublicDir: false,
		minify: isProduction(mode) ? 'oxc' : false,
		sourcemap: !isProduction(mode),
		watch: isProduction(mode) ? null : { include: 'src/**' },
	},
}));
