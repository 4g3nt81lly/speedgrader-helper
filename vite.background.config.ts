import fg from 'fast-glob';
import { resolve } from 'path';
import { defineConfig, type PluginOption } from 'vite';
import { hotReloadExtension, isProduction, resolveOptions } from './vite.shared';

export default defineConfig(({ mode }) => ({
	plugins: [
		processManifestJson(),
		watchPublicFiles(),
		hotReloadExtension(function (socket) {
			this.info('Hot reloading extension...');
			socket.emit('hr', 'reload');
		}),
	],
	resolve: resolveOptions,
	publicDir: 'src/public',
	build: {
		rolldownOptions: {
			input: resolve(__dirname, 'src/services/background/main.ts'),
			output: {
				entryFileNames: 'background.js',
				assetFileNames: 'assets/[name]-[hash][extname]',
				codeSplitting: false,
			},
		},
		outDir: isProduction(mode) ? 'dist' : 'build',
		emptyOutDir: false,
		copyPublicDir: true,
		minify: isProduction(mode) ? 'oxc' : false,
		sourcemap: !isProduction(mode),
		watch: isProduction(mode) ? null : { include: 'src/**' },
	},
}));

function processManifestJson(): PluginOption {
	return {
		name: 'process-manifest-json',
		// Modify manifest.json for development purposes only
		apply: (_config, env) => !isProduction(env.mode),
		async writeBundle(outputOptions) {
			this.environment.logger.info('Enabling React devtools support for development...');

			const manifestJsonPath = resolve(outputOptions.dir!, 'manifest.json');
			const manifestJson = await this.fs.readFile(manifestJsonPath, { encoding: 'utf8' });
			const manifestObject = JSON.parse(manifestJson);

			// Enable standalone React developer tools
			manifestObject['content_security_policy'] = {
				extension_pages: `script-src 'self' ${process.env.REACT_DEVTOOLS_SERVER_URL}; object-src 'self';`,
			};

			await this.fs.writeFile(manifestJsonPath, JSON.stringify(manifestObject, null, 4), {
				encoding: 'utf8',
			});
		},
	};
}

function watchPublicFiles(): PluginOption {
	return {
		name: 'watch-public-files',
		apply: (_config, env) => !isProduction(env.mode),
		async buildStart() {
			for (const publicFile of await fg.glob('src/public/**', { cwd: __dirname })) {
				this.addWatchFile(resolve(__dirname, publicFile));
			}
		},
	};
}
