import concurrently from 'concurrently';

const buildMode = process.env.BUILD_MODE ?? 'production';

if (!['development', 'production'].includes(buildMode)) {
	console.error(`Unknown build mode "${buildMode}"`);
	process.exit(1);
}

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
