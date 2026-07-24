import Constants from '#shared/constants';
import type { Nullable, SetOptional } from '#shared/types/utils';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

export type SnackbarItem = {
	id: string;
	type?: SnackbarItemType;
	title?: string;
	message: string;
	icon?: string;
	timeoutSeconds?: number;
	retry?: {
		handler: () => void;
		tooltip?: string;
		icon?: ReactNode;
	};
	dismiss?: {
		tooltip?: string;
		icon?: ReactNode;
	};
	onDismiss?: () => void;
};

export type SnackbarItemType = 'info' | 'success' | 'error' | 'warning';

export type SnackbarState = {
	stack: string[];
	items: Record<string, SnackbarItem & { timeoutId: Nullable<number> }>;
};

export const useSnackbarState = create<SnackbarState>()(() => ({
	stack: [],
	items: {},
}));

export function postSnackbarItem(item: SetOptional<SnackbarItem, 'id'>) {
	const id = item.id ?? uuidv4();
	let timeoutId: Nullable<number> = null;
	if (typeof item.timeoutSeconds === 'number') {
		timeoutId = setTimeout(() => {
			removeSnackbarItems(id);
			item.onDismiss?.();
		}, item.timeoutSeconds * Constants.SECOND_MS);
	}
	useSnackbarState.setState((state) => {
		const oldTimeoutId = state.items[id]?.timeoutId;
		if (typeof oldTimeoutId === 'number') {
			clearTimeout(oldTimeoutId);
		}
		return {
			stack: [...state.stack.filter((itemId) => itemId !== id), id],
			items: {
				...state.items,
				[id]: { ...item, id, timeoutId },
			},
		};
	});
}

export function removeSnackbarItems(items: string | string[]) {
	const itemIds = Array.isArray(items) ? items : [items];
	useSnackbarState.setState((state) => {
		const newStack = state.stack.filter((itemId) => !itemIds.includes(itemId));
		const newItems = { ...state.items };
		itemIds.forEach((itemId) => {
			const item = newItems[itemId];
			if (!item) return;
			if (item.timeoutId !== null) {
				clearTimeout(item.timeoutId);
			}
			delete newItems[itemId];
		});
		return { stack: newStack, items: newItems };
	});
}

export function clearSnackbarItems() {
	const items = useSnackbarState.getState().stack;
	removeSnackbarItems(items);
}
