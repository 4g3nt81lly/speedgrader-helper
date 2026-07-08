import type { Nullable } from './types/utils';

type QueryElementOptions = {
	recursive?: boolean;
	timeout?: Nullable<number>;
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
	return new Promise<Nullable<E>>((resolve) => {
		const mutationObserver = new MutationObserver((mutations) => {
			if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
				const element = root.querySelector<E>(querySelector);
				if (element !== null) {
					mutationObserver.disconnect();
					resolve(element);
				}
			}
		});
		mutationObserver.observe(root, {
			childList: true,
			subtree: options.recursive ?? true,
		});
		if (typeof options.timeout === 'number') {
			setTimeout(() => {
				console.error(
					`Element query with selector "${querySelector}" timed out (${options.timeout}ms)`
				);
				resolve(null);
			}, options.timeout);
		}
	});
}

export function getBaseUrl(urlString: string) {
	const url = new URL(urlString);
	return url.origin + url.pathname;
}
