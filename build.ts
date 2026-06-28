import { config as loadEnv } from '@dotenvx/dotenvx';
import concurrently from 'concurrently';
import fs from 'fs-extra';
import { resolve } from 'path';
import { Server as SocketServer } from 'socket.io';
import { build } from 'vite';

const buildMode = process.env.BUILD_MODE ?? 'production';

if (!['development', 'production'].includes(buildMode)) {
	console.error(`Unknown build mode "${buildMode}"`);
	process.exit(1);
}

loadEnv({ path: resolve(`.env.${buildMode}`) });

const configEntries = [
	{ name: 'background', color: 'green' },
	{ name: 'sidepanel', color: 'cyan' },
	{ name: 'content', color: 'blue' },
	{ name: 'insider', color: 'yellow' },
];

if (buildMode === 'production') {
	await fs.emptyDir(resolve('dist'));
	try {
		for (const { name } of configEntries) {
			await build({ configFile: `vite.${name}.config.ts`, mode: buildMode });
		}
	} catch (error) {
		console.error('Build error:', error);
		await fs.emptyDir(resolve('dist'));

		process.exit(1);
	}
} else {
	const devServerPort = Number(process.env.DEV_WS_SERVER_PORT);
	if (!isFinite(devServerPort)) {
		console.error('Invalid or missing dev server port');
		process.exit(1);
	}
	await fs.emptyDir(resolve('build'));

	const devServer = new SocketServer(devServerPort, { cors: { origin: '*' } });
	devServer.on('connection', (socket) => {
		const role = socket.handshake.auth.role;
		socket.join(role);

		if (role === 'builder') {
			socket.on('hr', (...args) => {
				socket.to('app').emit('hr', ...args);
			});
		}
	});
	console.log(`Dev server listening on ${devServerPort}...`);

	const buildEnv = {
		VITE_DEV_WS_SERVER_URI: process.env.VITE_DEV_WS_SERVER_URI,
		REACT_DEVTOOLS_SERVER_URL: process.env.REACT_DEVTOOLS_SERVER_URL,
	};

	concurrently(
		configEntries.map(({ name, color }) => ({
			name,
			command: `vite build --config vite.${name}.config.ts --mode ${buildMode}`,
			prefixColor: color,
			env: buildEnv,
		})),
		{
			prefix: 'name',
			killOthersOn: 'failure',
		}
	);

	process.once('SIGINT', () => {
		console.log('Closing dev server...');
		devServer.close();
	});
}
