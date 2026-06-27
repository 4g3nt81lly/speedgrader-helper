import concurrently from 'concurrently';
import fs from 'fs-extra';
import { resolve } from 'path';
import { build } from 'vite';

const buildMode = process.env.BUILD_MODE ?? 'production';

if (!['development', 'production'].includes(buildMode)) {
	console.error(`Unknown build mode "${buildMode}"`);
	process.exit(1);
}

if (buildMode === 'production') {
	await fs.emptyDir(resolve('dist'));
	try {
		for (const configName of ['background', 'sidepanel', 'content', 'insider']) {
			await build({ configFile: `vite.${configName}.config.ts`, mode: buildMode });
		}
	} catch (error) {
		console.error('Build error:', error);
		await fs.emptyDir(resolve('dist'));

		process.exit(1);
	}
} else {
	await fs.emptyDir(resolve('build'));
	concurrently(
		[
			{
				name: 'background',
				command: `vite build --config vite.background.config.ts --mode ${buildMode}`,
				prefixColor: 'green',
			},
			{
				name: 'side-panel',
				command: `vite build --config vite.sidepanel.config.ts --mode ${buildMode}`,
				prefixColor: 'cyan',
			},
			{
				name: 'content',
				command: `vite build --config vite.content.config.ts --mode ${buildMode}`,
				prefixColor: 'blue',
			},
			{
				name: 'insider',
				command: `vite build --config vite.insider.config.ts --mode ${buildMode}`,
				prefixColor: 'yellow',
			},
		],
		{
			prefix: 'name',
			killOthersOn: 'failure',
		}
	);
}
