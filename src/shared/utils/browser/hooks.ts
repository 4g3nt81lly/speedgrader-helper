import Constants from '#shared/constants';
import type { Nullable } from '#shared/types/utils';
import { useRef } from 'react';
import { useSelector } from 'react-redux';

export const useReduxSelector = {
	withType<State>() {
		return <Key extends keyof State>(key: Key) => {
			return useSelector<State, State[Key]>((state) => state[key]);
		};
	},
};

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
