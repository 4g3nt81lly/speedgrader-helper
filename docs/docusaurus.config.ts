import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

// Node.js - No client-side code here (browser APIs, JSX...)

export default {
	title: 'SpeedGrader Helper Documentation',

	// See https://docusaurus.io/docs/api/docusaurus-config#future
	future: {
		v4: true,
	},

	url: 'https://4g3nt81lly.github.io',
	baseUrl: '/speedgrader-helper/',

	onBrokenLinks: 'throw',
	onBrokenAnchors: 'log',

	i18n: {
		defaultLocale: 'en',
		locales: ['en'],
	},

	presets: [
		[
			'classic',
			{
				docs: {
					routeBasePath: '/',
					sidebarPath: './sidebars.ts',
				},
				theme: {
					customCss: './src/css/custom.css',
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		colorMode: {
			respectPrefersColorScheme: true,
		},
		navbar: {
			title: 'SpeedGrader Helper',
			items: [
				{
					type: 'docSidebar',
					sidebarId: 'tutorialSidebar',
					position: 'left',
					label: 'User Guide',
				},
				{
					href: 'https://github.com/4g3nt81lly/speedgrader-helper',
					label: 'GitHub',
					position: 'right',
				},
			],
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
} satisfies Config;
