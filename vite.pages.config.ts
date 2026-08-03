import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig, type PluginOption } from 'vite';
import { hotReloadExtension, isProduction, sharedResolveOptions } from './vite.shared';

export default defineConfig(({ mode }) => ({
	plugins: [
		react(),
		tailwindcss(),
		populateIndexHtmlPreamble(mode),
		hotReloadExtension(function (socket) {
			this.info('Reloading side panel...');
			socket.emit('hr', 'reloadSidePanel');
		}),
	],
	root: 'src',
	resolve: {
		...sharedResolveOptions,
		'#pages': resolve(__dirname, 'src/pages'),
	},
	build: {
		rolldownOptions: {
			input: {
				main: resolve(__dirname, 'src/pages/main/index.html'),
				settings: resolve(__dirname, 'src/pages/settings/index.html'),
			},
			output: {
				chunkFileNames: 'chunks/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash][extname]',
			},
		},
		modulePreload: false,
		outDir: `../${isProduction(mode) ? 'dist' : 'build'}`,
		emptyOutDir: false,
		copyPublicDir: false,
		minify: isProduction(mode) ? 'oxc' : false,
		sourcemap: !isProduction(mode),
		watch: isProduction(mode) ? null : { include: 'src/**' },
	},
	envDir: '..',
}));

function populateIndexHtmlPreamble(mode: string): PluginOption {
	return {
		name: 'populate-index-html-preamble',
		transformIndexHtml(html, _ctx) {
			if (!isProduction(mode)) {
				html = html.replace(
					'<!--PREAMBLE-->',
					`<script src="${process.env.REACT_DEVTOOLS_SERVER_URL}"></script>`
				);
			}
			return html;
		},
	};
}
