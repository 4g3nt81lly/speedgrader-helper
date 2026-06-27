import Decimal from 'decimal.js';
import { ContentCommand, sendMessageToTab } from '~/shared/message';
import type { ISnackbarItem } from '~/types/snackbar';
import type { Nullable, SetOptional } from '~/types/utils';
import { ContentEvent, dispatchContentEvent } from './event';

/**
 * Shared utility functions
 */

export function pushSnackbarItem(
	item: SetOptional<ISnackbarItem, 'id'>,
	sender: 'external' | 'toplevel' | 'iframe' = 'external'
) {
	if (sender === 'external') {
		sendMessageToTab(
			{ command: ContentCommand.pushSnackbarItem, item },
			{ noThrowOnNoReceiver: true }
		);
	} else {
		dispatchContentEvent(
			ContentEvent.pushSnackbarItem,
			{ item },
			sender === 'toplevel' ? window : window.parent
		);
	}
}

export type QueryElementOptions = {
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

// NOTE: This returns true iff the number is nonnegative
export function isDecimalPositive(decimal: Decimal.Value) {
	return Decimal(decimal).isPositive();
}

export function isDecimalNegative(decimal: Decimal.Value) {
	return Decimal(decimal).isNegative();
}

export function isDecimalEqual(decimal1: Decimal.Value, decimal2: Decimal.Value) {
	return Decimal.sub(decimal1, decimal2).isZero();
}

export function isDecimalGreaterThan(decimal1: Decimal.Value, decimal2: Decimal.Value) {
	// Careful: isNegative() is used for strict inequality since isPositive() returns true for 0
	return Decimal.sub(decimal2, decimal1).isNegative();
}

export function isDecimalLessThan(decimal1: Decimal.Value, decimal2: Decimal.Value) {
	return Decimal.sub(decimal1, decimal2).isNegative();
}

export function isDecimalWithinRange(
	decimal: Decimal.Value,
	lower: Decimal.Value,
	upper: Decimal.Value
) {
	return !isDecimalLessThan(decimal, lower) && !isDecimalGreaterThan(decimal, upper);
}
