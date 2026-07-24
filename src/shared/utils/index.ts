import { TimeoutError } from '#shared/errors';
import type { Nullable } from '#shared/types/utils';

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
