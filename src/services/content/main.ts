/**
 * Content Script
 * This script runs in the context of the webpage and can access the DOM.
 * Use it to interact with page content and send messages to the background script.
 */

import {
	addMessageListener,
	type ContentCommand,
	type ICommandMessage,
} from '~/shared/message';
import Patterns from '~/shared/patterns';
import messageHandlers from './handlers';
import { quizInjectors } from './QuizInjector';

addMessageListener(async (message: ICommandMessage<ContentCommand>) => {
	return messageHandlers[message.command]?.(<any>message);
});

if (import.meta.env.DEV || document.URL.match(Patterns.SG_URL_ORIGIN)) {
	const injector = quizInjectors.oldSpeedGrader;
	new injector().inject({});
}

console.log('SpeedGrader Helper: Content script loaded');
