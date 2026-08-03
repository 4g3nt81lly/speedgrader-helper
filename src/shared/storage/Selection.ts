import type { Nullable } from '#shared/types/utils';
import type { LocalStorageSchema } from './types';

export default class SelectionLocalStorage {
	public static async get(): Promise<Nullable<LocalStorageSchema['selection']>> {
		try {
			const { selection } =
				await chrome.storage.sync.get<LocalStorageSchema>('selection');
			return selection ?? null;
		} catch (error) {
			throw new Error(`Failed to fetch selection state from persistent store: ${error}`);
		}
	}

	public static async set(selection: LocalStorageSchema['selection']) {
		return chrome.storage.sync.set<LocalStorageSchema>({ selection }).catch((error) => {
			throw new Error(`Failed to set selection state in persistent store: ${error}`);
		});
	}
}
