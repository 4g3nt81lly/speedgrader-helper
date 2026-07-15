import Constants from '#shared/constants';
import { Nullable } from '#shared/types/utils';
import { useRef } from 'react';

export default function useDebounce<Callback extends (...args: any) => void>(
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
