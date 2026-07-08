import type { Optional } from '#shared/types/utils';

interface GetLocalStoreFunction<Store> {
	<Key extends keyof Store>(key: Key): Promise<Optional<Store[Key]>>;
	<Key extends (keyof Store)[] = []>(
		keys: Key
	): Promise<Pick<Partial<Store>, Key[number]>>;
}

export const getLocalStore = {
	withType<Store>(): GetLocalStoreFunction<Store> {
		return async (key: keyof Store | (keyof Store)[]) => {
			const store = await chrome.storage.local.get<Store>(key);
			return <any>(Array.isArray(key) ? store : store[key]);
		};
	},
};
