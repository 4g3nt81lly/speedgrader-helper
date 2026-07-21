import Constants from '#shared/constants';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

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

export type SnackbarState = {
	stack: string[];
	items: Record<string, ISnackbarItem>;
};

export const useSnackbarState = create<SnackbarState>()(() => ({
	stack: [],
	items: {},
}));

export function postSnackbarItem(item: Omit<ISnackbarItem, 'id'>) {
	const id = uuidv4();
	if (!item.closeReason || item.closeReason === 'timeout') {
		setTimeout(() => removeSnackbarItems(id), item.timeoutMs ?? 5 * Constants.SECOND_MS);
	}
	useSnackbarState.setState((state) => ({
		stack: [...state.stack, id],
		items: { ...state.items, [id]: { ...item, id } },
	}));
}

export function removeSnackbarItems(items: string | string[]) {
	const itemIds = Array.isArray(items) ? items : [items];
	useSnackbarState.setState((state) => {
		const newStack = state.stack.filter((itemId) => !itemIds.includes(itemId));
		const newItems = { ...state.items };
		itemIds.forEach((itemId) => delete newItems[itemId]);
		return { stack: newStack, items: newItems };
	});
}
