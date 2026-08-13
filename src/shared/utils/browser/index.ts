import SharedConstants from '#shared/constants';
import type { Nullable } from '#shared/types/utils';
import { withTimeout } from '..';

declare global {
	interface Node {
		cloneNode(subtree?: boolean): this;
	}
}

export function reloadPage() {
	window.location.reload();
}

type QueryElementOptions = {
	timeoutSeconds?: number;
	recursive?: boolean;
};

export async function waitForElement<E extends Element = Element>(
	querySelector: string,
	root: ParentNode = document,
	options: QueryElementOptions = {}
): Promise<Nullable<E>> {
	const element = root.querySelector<E>(querySelector);
	if (element !== null) {
		return element;
	}
	const promise = new Promise<E>((resolve) => {
		const mutationObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const addedNode of mutation.addedNodes) {
					if (!(addedNode instanceof Element) || !addedNode.matches(querySelector))
						continue;
					mutationObserver.disconnect();
					resolve(<E>addedNode);
				}
			}
		});
		mutationObserver.observe(root, {
			childList: true,
			subtree: options.recursive ?? true,
		});
	});
	const timeoutSeconds = options.timeoutSeconds ?? 0;
	return withTimeout(promise, timeoutSeconds * SharedConstants.SECOND_MS, null);
}

export function getBaseUrl(urlString: string) {
	const url = new URL(urlString);
	return url.origin + url.pathname;
}
