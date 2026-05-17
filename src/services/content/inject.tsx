import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { StyledEngineProvider } from '@mui/styled-engine';
import { StrictMode, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import type { Nullable } from '~/types/utils';
import baseStyles from './ui/base.css?inline';

type InjectDOMOptions = {
	document?: Document;
	before?: Nullable<Node>;
	hostId?: string;
	hostClassNames?: string[];
};

export function injectReactShadowDOM(
	container: Node,
	element: ReactNode | (() => ReactNode),
	options: InjectDOMOptions = {}
) {
	const currentDocument = options.document ?? document;

	const host = currentDocument.createElement('div');
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
	const baseStylesElement = currentDocument.createElement('style');
	baseStylesElement.textContent = baseStyles;
	shadowRoot.appendChild(baseStylesElement);

	// Inject root container
	const root = currentDocument.createElement('div');
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
		<StrictMode>
			<StyledEngineProvider enableCssLayer>
				<CacheProvider value={cache}>
					{typeof element === 'function' ? element() : element}
				</CacheProvider>
			</StyledEngineProvider>
		</StrictMode>
	);

	return { reactRoot, shadowRoot };
}
