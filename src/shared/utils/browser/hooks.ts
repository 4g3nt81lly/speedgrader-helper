import Constants from '#shared/constants';
import type { Nullable } from '#shared/types/utils';
import { useRef } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';

export function useDebounce<Callback extends (...args: any) => void>(
	callback: Callback,
	delayMS: number = 0.5 * Constants.SECOND_MS
): (...args: Parameters<Callback>) => void {
	const timeoutRef = useRef<Nullable<number>>(null);

	return (...args: Parameters<Callback>) => {
		if (timeoutRef.current !== null) return;
		callback(...args);
		timeoutRef.current = setTimeout(() => {
			timeoutRef.current = null;
		}, delayMS);
	};
}

type WithSelectors<S> = S extends { getState: () => infer T }
	? S & { use: { [K in keyof T]: () => T[K] } }
	: never;

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(_store: S) => {
	const store = _store as WithSelectors<typeof _store>;
	store.use = {};
	for (const k of Object.keys(store.getState())) {
		(store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
	}
	return store;
};
