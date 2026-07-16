import Constants from './constants';
import type {
	CommandMessage,
	CommandMessagePayload,
	ContentCommand,
	MessageResponse,
	RuntimeCommand,
} from './types/message';
import type { Optional } from './types/utils';
import { getActiveTab, TimeoutError, withTimeout } from './utils';

type CommandHandlers = {
	[Command in keyof CommandMessagePayload]: (
		payload: CommandMessagePayload[Command],
		sender: chrome.runtime.MessageSender
	) => any;
};

export function addCommandHandler(handlers: Partial<CommandHandlers>) {
	return addMessageListener<CommandMessage>((message, sender) => {
		const handler = handlers[message.command];
		if (!handler) return;
		return handler(message as unknown as any, sender);
	});
}

function addMessageListener<Message>(
	handler: (message: Message, sender: chrome.runtime.MessageSender) => any,
	timeout: number = 5 * Constants.SECOND_MS
) {
	const listener = (
		message: any,
		sender: chrome.runtime.MessageSender,
		sendResponse: (response?: any) => void
	) => {
		try {
			var result = handler(message, sender);
		} catch (error) {
			sendResponse(makeErrorResponsePayload(error));
			return false;
		}
		if (result instanceof Promise) {
			(async () => {
				try {
					const response = await withTimeout(result, timeout);
					if (response !== undefined) {
						sendResponse({ data: response } satisfies MessageResponse);
					}
				} catch (error) {
					if (error instanceof TimeoutError) {
						error.message =
							'Timed out while waiting for an asynchronous message response';
						console.error(error.message);
					}
					sendResponse(makeErrorResponsePayload(error));
				}
			})();
			return true;
		}
		if (result !== undefined) {
			sendResponse({ data: result } satisfies MessageResponse);
		}
		return false;
	};
	chrome.runtime.onMessage.addListener(listener);
	return () => chrome.runtime.onMessage.removeListener(listener);
}

function makeErrorResponsePayload(error: unknown): MessageResponse {
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
	throwOnNoReceiver?: boolean;
};

async function sendMessage<T = unknown>(
	messagePromise: Promise<Optional<MessageResponse<T>>>,
	options: SendMessageOptions = {}
): Promise<Optional<T>> {
	const { timeout, throwOnNoReceiver } = options;
	let response: Optional<MessageResponse<T>>;
	try {
		if (timeout && timeout.milliseconds > 0) {
			response = await withTimeout(messagePromise, timeout.milliseconds);
		} else {
			response = await messagePromise;
		}
	} catch (error) {
		if (error instanceof TimeoutError) {
			throw new Error(`Message timed out (${timeout!.milliseconds}ms)`);
		}
		if (!(error instanceof Error)) {
			throw new Error('An error occurred while messaging');
		}
		if (
			error.message.endsWith(Constants.RECEIVING_END_DNE_MESSAGE) &&
			!throwOnNoReceiver
		) {
			return undefined;
		}
		throw error;
	}
	if (!response) {
		return undefined;
	}
	if (response.error) {
		// The receiver responded with an error object
		throw new Error(response.error.message);
	}
	return response.data;
}

type SendMessageToRuntimeOptions = {} & SendMessageOptions;

export function sendMessageToRuntime<
	T = unknown,
	C extends RuntimeCommand = RuntimeCommand,
>(message: CommandMessage<C>, options: SendMessageToRuntimeOptions = {}) {
	return <Promise<T>>sendMessage<T>(chrome.runtime.sendMessage(message), options);
}

export const sendMessageToBackground = sendMessageToRuntime;

type SendMessageToTabOptions = {
	tabId?: number;
} & SendMessageOptions;

interface SendMessageToTabFunction {
	<T = unknown, C extends ContentCommand = ContentCommand>(
		message: CommandMessage<C>
	): Promise<Optional<T>>;
	<T = unknown, C extends ContentCommand = ContentCommand>(
		message: CommandMessage<C>,
		options: Omit<SendMessageToTabOptions, 'throwOnNoReceiver'> & {
			throwOnNoReceiver: true;
		}
	): Promise<T>;
	<T = unknown, C extends ContentCommand = ContentCommand>(
		message: CommandMessage<C>,
		options: Omit<SendMessageToTabOptions, 'throwOnNoReceiver'> &
			({ throwOnNoReceiver: false } | {})
	): Promise<Optional<T>>;
}

export const sendMessageToTab: SendMessageToTabFunction = async function <
	T = unknown,
	C extends ContentCommand = ContentCommand,
>(message: CommandMessage<C>, options: SendMessageToTabOptions = {}) {
	let { tabId } = options;
	if (tabId === undefined) {
		const activeTab = await getActiveTab();
		if (!activeTab) {
			throw new Error('No active tab in the current window');
		}
		tabId = activeTab.id!;
	}
	return sendMessage<T>(chrome.tabs.sendMessage(tabId, message), options);
};

export async function broadcastMessageToTabs<C extends ContentCommand = ContentCommand>(
	message: CommandMessage<C>,
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
		tabs.map((tab) => sendMessageToTab(message, { tabId: tab.id! }))
	);
}
