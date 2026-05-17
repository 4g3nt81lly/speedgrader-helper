import type { QuestionFeedback } from '~/models/Feedback';
import type { IQuestion } from '~/models/Question';
import type { IQuiz } from '~/models/Quiz';
import type { QuizLoaderPayload, QuizLoaderType } from '~/services/content/QuizLoader';
import type { ISnackbarItem } from '../types/snackbar';
import type { SetOptional } from '../types/utils';

export const enum BackgroundCommand {
	addQuizToStore = 0x00,
	updateQuizInStore,
	removeQuizzesFromStore,

	updateQuestionFeedbackInStore,
	updateQuizLastGradedQuestion,

	devReloadExtension,
}

export const enum ContentCommand {
	loadQuiz = 0x10,
	injectQuiz,

	pushSnackbarItem,
	popSnackbarItems,

	reinjectRubric,
	updateFocusState,
	reloadPage,
}
export type RuntimeCommand = BackgroundCommand | ContentCommand;

export type ICommandMessage<
	C extends keyof CommandMessagePayload = keyof CommandMessagePayload,
> = {
	command: C;
} & CommandMessagePayload[C];

export type IMessageResponse<T = any> =
	| {
			error: {
				message: string;
			};
			data?: T;
	  }
	| {
			data: T;
			error?: undefined;
	  };

type CommandMessagePayload = {
	/* Background script command */

	[BackgroundCommand.addQuizToStore]: {
		quiz: IQuiz;
	};
	[BackgroundCommand.updateQuizInStore]: {
		quiz: IQuiz;
	};
	[BackgroundCommand.removeQuizzesFromStore]:
		| { quizId: IQuiz['id']; quizIds?: undefined }
		| { quizId?: undefined; quizIds: IQuiz['id'][] };

	[BackgroundCommand.updateQuestionFeedbackInStore]: {
		quizId: IQuiz['id'];
		submissionId: string;
		question:
			| { id?: undefined; feedback: QuestionFeedback }
			| { id: IQuestion['id']; feedback?: undefined };
	};
	[BackgroundCommand.updateQuizLastGradedQuestion]: {
		quizId: IQuiz['id'];
		questionId: IQuestion['id'];
	};

	[BackgroundCommand.devReloadExtension]: {};

	/* Content script command */

	[ContentCommand.loadQuiz]: {
		loader: QuizLoaderType;
		payload?: QuizLoaderPayload;
	};
	[ContentCommand.injectQuiz]: {};

	[ContentCommand.pushSnackbarItem]: {
		item: SetOptional<ISnackbarItem, 'id'>;
	};
	[ContentCommand.popSnackbarItems]: {
		itemIds: ISnackbarItem['id'] | ISnackbarItem['id'][];
	};

	[ContentCommand.reinjectRubric]: {
		question: IQuestion;
	};
	[ContentCommand.updateFocusState]:
		| {
				focusMode: 'on';
				target: Record<IQuestion['id'], true>;
		  }
		| {
				focusMode: 'select';
				target: 'all' | Record<IQuestion['id'], boolean> | 'none';
		  }
		| {
				focusMode: 'off';
				target: null;
		  };
	[ContentCommand.reloadPage]: {};
};

export function addMessageListener<Message>(
	handler: (message: Message, sender: chrome.runtime.MessageSender) => any
) {
	const listener = (
		message: any,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response?: any) => void
	) => {
		try {
			var result = handler(message, sender);
		} catch (error) {
			return sendResponse(makeErrorResponsePayload(error));
		}
		if (result instanceof Promise) {
			(async () => {
				try {
					const response = await result;
					if (response !== undefined) {
						sendResponse({ data: response } satisfies IMessageResponse);
					}
				} catch (error) {
					sendResponse(makeErrorResponsePayload(error));
				}
			})();
			return true;
		}
		if (result !== undefined) {
			sendResponse({ data: result } satisfies IMessageResponse);
		}
	};
	chrome.runtime.onMessage.addListener(listener);
	return () => chrome.runtime.onMessage.removeListener(listener);
}

function makeErrorResponsePayload(error: unknown): IMessageResponse {
	return {
		error: {
			message:
				error instanceof Error ? error.message : 'Unhandled error from message handler',
		},
	};
}

type SendMessageToRuntimeOptions = {
	timeout?: {
		milliseconds: number;
		message?: string;
	};
	// TODO: Implement this option and check where the errors should be silenced
	noThrowOnNoReceiver?: boolean;
};

export async function sendMessageToRuntime<
	T = unknown,
	C extends RuntimeCommand = RuntimeCommand,
>(message: ICommandMessage<C>, options: SendMessageToRuntimeOptions = {}): Promise<T> {
	const { timeout } = options;
	const promises = [
		chrome.runtime.sendMessage(message).then((response: IMessageResponse<T>) => {
			if (response.error) {
				// The receiver responded with an error object
				throw new Error(response.error.message);
			}
			return response.data;
		}),
	];
	if (timeout && timeout.milliseconds > 0) {
		promises.push(
			new Promise((_, reject) =>
				setTimeout(() => reject('TIMEOUT'), timeout.milliseconds)
			)
		);
	}
	try {
		return await Promise.race(promises);
	} catch (error) {
		if (error === 'TIMEOUT') {
			throw new Error(
				timeout?.message
					? `${timeout.message} (${timeout.milliseconds}ms)`
					: `Message timeout (${timeout!.milliseconds}ms)`
			);
		}
		throw error;
	}
}

export const sendMessageToBackground = sendMessageToRuntime;

type SendMessageToTabOptions = {
	tabId?: number;
	timeout?: {
		milliseconds: number;
		message?: string;
	};
	// TODO: Implement this option and check where the errors should be silenced
	noThrowOnNoReceiver?: boolean;
};

export async function sendMessageToTab<
	T = unknown,
	C extends ContentCommand = ContentCommand,
>(message: ICommandMessage<C>, options: SendMessageToTabOptions = {}): Promise<T> {
	let { timeout, tabId } = options;
	if (tabId === undefined) {
		const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
		if (!activeTab) {
			throw new Error('No active tab in the current window');
		}
		tabId = activeTab.id!;
	}
	const promises = [
		chrome.tabs.sendMessage(tabId, message).then((response: IMessageResponse<T>) => {
			if (response.error) {
				// The receiver responded with an error object
				throw new Error(response.error.message);
			}
			return response.data;
		}),
	];
	if (timeout && timeout.milliseconds > 0) {
		promises.push(
			new Promise((_, reject) =>
				setTimeout(() => reject('TIMEOUT'), timeout.milliseconds)
			)
		);
	}
	try {
		return await Promise.race(promises);
	} catch (error) {
		if (error === 'TIMEOUT') {
			throw new Error(
				timeout?.message
					? `${timeout.message} (${timeout.milliseconds}ms)`
					: `Message timeout (${timeout!.milliseconds}ms)`
			);
		}
		throw error;
	}
}

export async function broadcastMessageToTabs<C extends ContentCommand = ContentCommand>(
	message: ICommandMessage<C>,
	query: chrome.tabs.QueryInfo = {},
	predicate?: (tab: chrome.tabs.Tab) => boolean
) {
	try {
		var tabs = (await chrome.tabs.query(query)).filter((tab) => {
			return tab.id !== undefined && (predicate?.(tab) ?? true);
		});
	} catch (error) {
		return console.error(
			'Failed to query tabs info while broadcasting message to tabs:',
			error
		);
	}
	await Promise.allSettled(
		tabs.map(async (tab) => chrome.tabs.sendMessage(tab.id!, message))
	);
}
