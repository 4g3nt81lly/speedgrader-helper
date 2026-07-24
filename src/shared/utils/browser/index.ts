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
	recursive?: boolean;
	timeout?: number;
};

export async function getElementByQuerySelector<E extends Element>(
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
			if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
				const element = root.querySelector<E>(querySelector);
				if (element === null) return;
				mutationObserver.disconnect();
				resolve(element);
			}
		});
		mutationObserver.observe(root, {
			childList: true,
			subtree: options.recursive ?? true,
		});
	});
	if (typeof options.timeout === 'number') {
		return withTimeout(promise, options.timeout, null);
	}
	return promise;
}

export function getBaseUrl(urlString: string) {
	const url = new URL(urlString);
	return url.origin + url.pathname;
}
