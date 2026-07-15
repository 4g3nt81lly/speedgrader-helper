import type { Nullable } from './types/utils';

export class TimeoutError extends Error {}

interface TimeoutWrapper {
	<T, D = never>(result: Promise<T> | (() => Promise<T>), timeout: number): Promise<T>;
	<T, D>(
		result: Promise<T> | (() => Promise<T>),
		timeout: number,
		defaultValue: D
	): Promise<T | D>;
}

export const withTimeout: TimeoutWrapper = function <T, D>(
	result: Promise<T> | (() => Promise<T>),
	timeout: number,
	...defaultValue: [D?]
): Promise<T | D> {
	const promise = typeof result === 'function' ? result() : result;
	const hasDefaultValue = defaultValue.length > 0;
	return Promise.race([
		promise,
		new Promise<T | D>((resolve, reject) => {
			setTimeout(() => {
				if (hasDefaultValue) {
					resolve(defaultValue[0]!);
				} else {
					reject(new TimeoutError());
				}
			}, timeout);
		}),
	]);
};

export async function getActiveTab(): Promise<Nullable<chrome.tabs.Tab>> {
	const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
	return activeTab ?? null;
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
