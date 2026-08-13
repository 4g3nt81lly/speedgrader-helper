import type { Nullable } from '#shared/types/utils';
import { ErrorBoundary } from '#shared/utils/browser/ErrorBoundary';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { StyledEngineProvider } from '@mui/joy';
import { type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { snackbar } from './actions/snackbar';
import baseStyles from './ui/base.css?inline';

type InjectDOMOptions = {
	before?: Nullable<Node>;
	hostId?: string;
	hostClassNames?: string[];
};

export function injectReactShadowDOM(
	container: Node,
	element: ReactNode | (() => ReactNode),
	options: InjectDOMOptions = {}
) {
	const targetDocument = container.ownerDocument ?? document;

	const host = targetDocument.createElement('div');
	if (options.hostId !== undefined) {
		host.id = options.hostId;
	}
	if (Array.isArray(options.hostClassNames)) {
		host.className = options.hostClassNames.join(' ');
	}
	const shadowRoot = host.attachShadow({ mode: 'open' });
	if (options.before) {
		container.insertBefore(host, options.before);
	} else {
		container.appendChild(host);
	}

	// Inject app base styles into shadow DOM
	const baseStylesElement = targetDocument.createElement('style');
	baseStylesElement.textContent = baseStyles;
	shadowRoot.appendChild(baseStylesElement);

	// Inject root container
	const root = targetDocument.createElement('div');
	root.id = 'root';
	shadowRoot.appendChild(root);

	// Apply MUI styles inside shadow DOM
	const cache = createCache({
		key: 'joy',
		prepend: true,
		container: shadowRoot,
	});

	const reactRoot = ReactDOM.createRoot(root);
	reactRoot.render(
		<ErrorBoundary
			onError={(error) => {
				console.error('An error has occurred in ShadowDOM-enclosed React component:', error);
				snackbar.post({
					message: `An unexpected error has occurred: ${error instanceof Error ? error.message : 'unknown error'}. Please reload the page!`,
					type: 'error',
				});
			}}
		>
			<StyledEngineProvider enableCssLayer>
				<CacheProvider value={cache}>
					{typeof element === 'function' ? element() : element}
				</CacheProvider>
			</StyledEngineProvider>
		</ErrorBoundary>
	);

	return { reactRoot, shadowRoot };
}
