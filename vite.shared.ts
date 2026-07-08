import { resolve } from 'path';
import { io, type Socket } from 'socket.io-client';
import { type ConfigPluginContext, type PluginOption } from 'vite';

export const resolveOptions = {
	alias: {
		'#models': resolve(__dirname, 'src/models'),
		'#schemas': resolve(__dirname, 'src/schemas'),
		'#background': resolve(__dirname, 'src/services/background'),
		'#content': resolve(__dirname, 'src/services/content'),
		'#shared': resolve(__dirname, 'src/shared'),
		'#sidepanel': resolve(__dirname, 'src/ui'),
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
