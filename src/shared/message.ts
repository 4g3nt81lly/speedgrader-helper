import type { QuestionFeedback } from '~/models/Feedback';
import type { IQuestion } from '~/models/Question';
import type { IQuiz } from '~/models/Quiz';
import type { QuizLoaderPayload } from '~/services/content/QuizLoader';
import type { QuizLoaderType } from './modules';
import type { ISnackbarItem } from '../types/snackbar';
import type { SetOptional } from '../types/utils';
import Constants from './constants';

export const enum BackgroundCommand {
	addQuizToStore = 0x00,
	updateQuizInStore,
	removeQuizzesFromStore,

	updateQuestionFeedbackInStore,
	updateQuizLastGradedQuestion,
}

export const enum ContentCommand {
	loadQuiz = 0x10,
	injectQuiz,

	pushSnackbarItem,
	popSnackbarItems,

	reloadRubric,
	updateFocusState,

	reloadAppSettings,
}

export type RuntimeCommand = BackgroundCommand | ContentCommand;

export type ICommandMessage<
	C extends keyof CommandMessagePayload = keyof CommandMessagePayload,
> = { command: C } & CommandMessagePayload[C];

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

	[ContentCommand.reloadRubric]: {
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

	[ContentCommand.reloadAppSettings]: {};
};

export function addCommandHandler<C extends keyof CommandMessagePayload>(
	command: C | C[],
	handler: (
		message: C extends unknown ? ICommandMessage<C> : never,
		sender: chrome.runtime.MessageSender
	) => any
) {
	const commands = Array.isArray(command) ? command : [command];
	return addMessageListener<ICommandMessage<C>>((message, sender) => {
		if (!commands.includes(message.command)) return;
		return handler(message as unknown as any, sender);
	});
}

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

type SendMessageOptions = {
	timeout?: {
		milliseconds: number;
		message?: string;
	};
	noThrowOnNoReceiver?: boolean;
};

async function sendMessage<T = unknown>(
	messagePromise: Promise<any>,
	options: SendMessageOptions = {}
): Promise<T> {
	const { timeout } = options;
	const promises = [
		messagePromise.then((response: IMessageResponse<T>) => {
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
		if (
			options.noThrowOnNoReceiver &&
			error instanceof Error &&
			error.message.endsWith(Constants.RECEIVING_END_DNE_MESSAGE)
		) {
			return <T>undefined;
		}
		throw error;
	}
}

type SendMessageToRuntimeOptions = {} & SendMessageOptions;

export function sendMessageToRuntime<
	T = unknown,
	C extends RuntimeCommand = RuntimeCommand,
>(message: ICommandMessage<C>, options: SendMessageToRuntimeOptions = {}) {
	return sendMessage<T>(chrome.runtime.sendMessage(message), options);
}

export const sendMessageToBackground = sendMessageToRuntime;

type SendMessageToTabOptions = {
	tabId?: number;
} & SendMessageOptions;

export async function sendMessageToTab<
	T = unknown,
	C extends ContentCommand = ContentCommand,
>(message: ICommandMessage<C>, options: SendMessageToTabOptions = {}): Promise<T> {
	let { tabId } = options;
	if (tabId === undefined) {
		const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
		if (!activeTab) {
			throw new Error('No active tab in the current window');
		}
		tabId = activeTab.id!;
	}
	return sendMessage<T>(chrome.tabs.sendMessage(tabId, message), options);
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
		tabs.map((tab) =>
			sendMessageToTab(message, { tabId: tab.id!, noThrowOnNoReceiver: true })
		)
	);
}
