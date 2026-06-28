import { resolve } from 'path';
import { io, type Socket } from 'socket.io-client';
import { type ConfigPluginContext, type PluginOption } from 'vite';

export const resolveOptions = {
	alias: {
		'~': resolve(__dirname, 'src'),
		'@models': resolve(__dirname, 'src/models'),
		'@schemas': resolve(__dirname, 'src/schemas'),
		'@services': resolve(__dirname, 'src/services'),
		'@shared': resolve(__dirname, 'src/shared'),
		'@components': resolve(__dirname, 'src/ui/components'),
		'@pages': resolve(__dirname, 'src/ui/pages'),
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
