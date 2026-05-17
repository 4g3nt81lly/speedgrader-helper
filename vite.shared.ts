import { resolve } from 'path';

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
