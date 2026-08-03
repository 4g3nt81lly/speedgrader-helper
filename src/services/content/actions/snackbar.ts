import Constants from '#content/constants';
import {
	snackbarState,
	type SnackbarItem,
	type SnackbarState,
} from '#content/stores/snackbar';
import type { Nullable, SetOptional } from '#shared/types/utils';
import StoreActions from '#shared/utils/browser/StoreActions';
import { v4 as uuidv4 } from 'uuid';

class SnackbarActions extends StoreActions<SnackbarState> {
	post(item: SetOptional<SnackbarItem, 'id'>) {
		const id = item.id ?? uuidv4();
		let timeoutId: Nullable<number> = null;
		if (typeof item.timeoutSeconds === 'number') {
			timeoutId = setTimeout(() => {
				this.remove(id);
				item.onDismiss?.();
			}, item.timeoutSeconds * Constants.SECOND_MS);
		}
		this.store.setState((state) => {
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

	remove(...items: SnackbarItem['id'][]) {
		this.store.setState((state) => {
			const newStack = state.stack.filter((itemId) => !items.includes(itemId));
			const newItems = { ...state.items };
			items.forEach((itemId) => {
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

	clear() {
		this.remove(...this.state.stack);
	}
}

export const snackbar = snackbarState.getActions(SnackbarActions);
