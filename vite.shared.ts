import babelPlugin from '@rolldown/plugin-babel';
import { resolve } from 'path';
import { io, type Socket } from 'socket.io-client';
import { type ConfigPluginContext, type PluginOption } from 'vite';

export const sharedResolveOptions = {
	alias: {
		'#models': resolve(__dirname, 'src/models'),
		'#schemas': resolve(__dirname, 'src/schemas'),
		'#shared': resolve(__dirname, 'src/shared'),
	},
};

export function isProduction(mode: string) {
	return mode === 'production';
}

const socketURI = process.env.VITE_DEV_WS_SERVER_URI;
if (socketURI) {
	var socket = io(socketURI, { auth: { role: 'builder' } });
}

export function hotReloadExtension(
	hotReload: (this: ConfigPluginContext, socket: Socket) => void
): PluginOption {
	return {
		name: 'hot-reload',
		apply: (_config, env) => !isProduction(env.mode),
		closeBundle(error) {
			if (error) return;
			hotReload.bind(this)(socket);
		},
	};
}

// https://github.com/vitejs/vite/discussions/21891#discussioncomment-17961380
// FIXME: This is only a temporary solution
export function stage3Decorators(): PluginOption {
	return babelPlugin({
		presets: [
			{
				preset: () => ({
					plugins: [['@babel/plugin-proposal-decorators', { version: '2023-11' }]],
				}),
				rolldown: { filter: { code: '@' } },
			},
		],
	});
}
