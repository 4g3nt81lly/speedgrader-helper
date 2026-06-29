import {
	addMessageListener,
	type ContentCommand,
	type ICommandMessage,
} from '~/shared/message';
import Patterns from '~/shared/patterns';
import messageHandlers from './handlers';
import { quizInjectors } from './QuizInjector';

addMessageListener((message: ICommandMessage<ContentCommand>) => {
	return messageHandlers[message.command]?.(<any>message);
});

if (import.meta.env.DEV || document.URL.match(Patterns.SG_URL_ORIGIN)) {
	const injector = quizInjectors.oldSG;
	new injector().inject({});
}

console.log('SpeedGrader Helper: Content script loaded');
