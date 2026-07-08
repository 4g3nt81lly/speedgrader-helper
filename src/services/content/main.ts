import {
	addMessageListener,
	type ContentCommand,
	type ICommandMessage,
} from '~/shared/message';
import Patterns from '~/shared/patterns';
import AppSettingsLocalStore from '~/shared/stores/AppSettingsLocalStore';
import gradingContext from './GradingContext';
import messageHandlers from './handlers';
import { quizInjectors } from '~/shared/modules';

addMessageListener((message: ICommandMessage<ContentCommand>) => {
	return messageHandlers[message.command]?.(<any>message);
});

if (import.meta.env.DEV || document.URL.match(Patterns.SG_URL_ORIGIN)) {
	(async () => {
		try {
			gradingContext.appSettings = {
				...gradingContext.appSettings,
				...(await AppSettingsLocalStore.getAll()),
			};
			const injector = quizInjectors[gradingContext.appSettings.defaultQuizInjector];
			new injector().inject();
		} catch (error) {
			console.error(
				'An error occurred during SGH injection:',
				error instanceof Error ? error.message : 'unknown'
			);
		}
	})();
}

console.log('SpeedGrader Helper: Content script loaded');
