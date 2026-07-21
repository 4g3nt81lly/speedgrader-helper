import { addCommandHandler } from '#shared/message';
import Patterns from '#shared/patterns';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';
import { ContentCommand } from '#shared/types/message';
import reloadAppSettings from './actions/reloadAppSettings';
import reloadQuiz from './actions/reloadQuiz';
import { quizInjectors, sgQuizLoaders } from './modules';
import { SGQuizLoader } from './modules/SGQuizLoader';
import { useContentStore } from './stores/main.store';

addCommandHandler({
	[ContentCommand.loadQuiz](payload) {
		const { loader: loaderType } = payload;
		const quizLoader = new sgQuizLoaders[loaderType](
			useContentStore.getState().appSettings
		);
		return quizLoader.getQuiz();
	},

	[ContentCommand.reloadAppSettings]() {
		reloadAppSettings();
	},
	[ContentCommand.reloadQuiz]() {
		reloadQuiz();
	},
});

if (import.meta.env.DEV || document.URL.match(Patterns.SG_URL_ORIGIN)) {
	(async () => {
		useContentStore.setState({ appSettings: await AppSettingsLocalStore.getAll() });

		const injector =
			quizInjectors[useContentStore.getState().appSettings.defaultQuizInjector];
		const canonicalUrl = SGQuizLoader.getCanonicalURL(document.URL);

		await new injector(canonicalUrl).inject();
	})().catch((error) => {
		console.error(
			'An error occurred during SGH injection:',
			error instanceof Error ? error.message : 'unknown'
		);
	});
}

console.log('SpeedGrader Helper: Content script loaded');
