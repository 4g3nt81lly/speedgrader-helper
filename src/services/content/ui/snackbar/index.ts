import { secondsToMilliseconds } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { v4 as uuidv4 } from 'uuid';
export { default as Snackbar } from './Snackbar';

export type SnackbarItemType = 'neutral' | 'success' | 'error' | 'warning';

export interface ISnackbarItem {
	id: string;
	type?: SnackbarItemType;
	title?: string;
	message: string;
	icon?: string;
	closeReason?: 'timeout' | 'manual';
	timeoutMs?: number;
}

type SnackbarState = {
	stack: string[];
	items: Record<string, ISnackbarItem>;
};

let snackbar: SnackbarState = {
	stack: [],
	items: {},
};

export function useSnackbarState() {
	return useSyncExternalStore(subscribe, () => snackbar);
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notifyAll() {
	listeners.forEach((listener) => listener());
}

export function postSnackbarItem(item: Omit<ISnackbarItem, 'id'>) {
	const id = uuidv4();
	if (!item.closeReason || item.closeReason === 'timeout') {
		setTimeout(() => removeSnackbarItems(id), item.timeoutMs ?? secondsToMilliseconds(5));
	}
	snackbar = {
		stack: [...snackbar.stack, id],
		items: { ...snackbar.items, [id]: { ...item, id } },
	};
	notifyAll();
}

export function removeSnackbarItems(items: string | string[]) {
	const itemIds = Array.isArray(items) ? items : [items];
	const newStack = snackbar.stack.filter((itemId) => !itemIds.includes(itemId));
	const newItems = { ...snackbar.items };
	for (const itemId of itemIds) {
		delete newItems[itemId];
	}
	snackbar = { stack: newStack, items: newItems };
	notifyAll();
}
