import SharedConstants from '#shared/constants';
import type { Nullable } from '#shared/types/utils';
import { useRef } from 'react';
import {
	type HotkeyCallback,
	type Options,
	useHotkeys as useHotkeysHook,
} from 'react-hotkeys-hook';

export function useDebounce<Callback extends (...args: any) => void>(
	callback: Callback,
	delaySeconds: number = 0.5
): (...args: Parameters<Callback>) => void {
	const timeoutRef = useRef<Nullable<number>>(null);

	return (...args: Parameters<Callback>) => {
		if (timeoutRef.current !== null) return;
		callback(...args);
		timeoutRef.current = setTimeout(() => {
			timeoutRef.current = null;
		}, delaySeconds * SharedConstants.SECOND_MS);
	};
}

type UseHotkeysOptions = {
	debounceSeconds?: number;
	callbackDeps?: unknown[];
} & Options;

export function useHotkeys(
	hotkeys: string,
	callback: HotkeyCallback,
	options: UseHotkeysOptions = {}
) {
	const { debounceSeconds, callbackDeps, ...otherOptions } = options;
	return useHotkeysHook(
		hotkeys,
		useDebounce(callback, debounceSeconds),
		{
			preventDefault: true,
			eventListenerOptions: { capture: true },
			...otherOptions,
		},
		callbackDeps
	);
}
