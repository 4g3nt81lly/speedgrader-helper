import { resolve } from 'path';
import { defineConfig } from 'vite';
import { hotReloadExtension, isProduction, sharedResolveOptions } from './vite.shared';

export default defineConfig(({ mode }) => ({
	plugins: [
		hotReloadExtension(function (socket) {
			this.info('Reloading active tab...');
			socket.emit('hr', 'reload');
			socket.emit('hr', 'reloadActiveTabs');
		}),
	],
	resolve: sharedResolveOptions,
	build: {
		rolldownOptions: {
			input: resolve(__dirname, 'src/services/content/insider.ts'),
			output: {
				entryFileNames: 'insider.js',
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
