import {
	addMessageListener,
	type ContentCommand,
	type ICommandMessage,
} from '~/shared/message';
import Patterns from '~/shared/patterns';
import { defaultAppSettings } from '~/shared/settings';
import AppSettingsLocalStore from '~/shared/stores/AppSettingsLocalStore';
import messageHandlers from './handlers';
import { quizInjectors } from './QuizInjector';

addMessageListener((message: ICommandMessage<ContentCommand>) => {
	return messageHandlers[message.command]?.(<any>message);
});

if (import.meta.env.DEV || document.URL.match(Patterns.SG_URL_ORIGIN)) {
	(async () => {
		try {
			const appSettings = await AppSettingsLocalStore.getAll();
			const injector =
				quizInjectors[
					appSettings.defaultQuizInjector ?? defaultAppSettings.defaultQuizInjector
				];
			new injector(appSettings).inject();
		} catch (error) {
			console.error(
				'An error occurred during SGH injection:',
				error instanceof Error ? error.message : 'unknown'
			);
		}
	})();
}

console.log('SpeedGrader Helper: Content script loaded');
