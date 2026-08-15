import type { IQuiz } from '#models/Quiz';
import { broadcastMessageToTabs } from '#shared/message';
import { toast } from 'sonner';
import global, { PageEvent } from './global';

export function syncPages() {
	global.pageChannel.postMessage({ type: PageEvent.syncState });
}

export function reloadSpeedGraderPages(...urls: IQuiz['url'][]) {
	return broadcastMessageToTabs({ name: 'app.reloadPage', urls });
}

export function toastOnError(message?: string, title: string = 'Something went wrong') {
	return function <This, Args extends any[], Return extends void | Promise<void>>(
		target: (this: This, ...args: Args) => Return
	) {
		const toastError = (error: unknown) => {
			toast.error(title, { description: message, duration: Infinity });
			throw error;
		};
		return function (this: This, ...args: Args) {
			try {
				const result = target.call(this, ...args);
				if (result instanceof Promise) {
					return <Return>result.catch(toastError);
				}
				return result;
			} catch (error) {
				return <Return>toastError(error);
			}
		};
	};
}

export function useToastOnErrorCallback<
	Args extends any[],
	Return extends void | Promise<void>,
>(callback: (...args: Args) => Return, message?: string, title?: string) {
	return toastOnError(message, title)(callback);
}

export function queued(name: string) {
	return function <This, Args extends any[], Return>(
		target: (this: This, ...args: Args) => Promise<Return>
	) {
		return function (this: This, ...args: Args) {
			return global.queues.run(name, () => target.call(this, ...args));
		};
	};
}

export function useQueuedCallback<Args extends any[], Return>(
	callback: (...args: Args) => Promise<Return>,
	name: string
) {
	return queued(name)(callback);
}
