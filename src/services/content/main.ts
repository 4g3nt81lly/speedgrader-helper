import { addCommandHandler, ContentCommand } from '#shared/message';
import Patterns from '#shared/patterns';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';
import gradingContext from './GradingContext';
import { quizInjectors, sgQuizLoaders } from './modules';
import { SGQuizLoader } from './modules/SGQuizLoader';
import { postSnackbarItem, removeSnackbarItems } from './ui/snackbar';

addCommandHandler({
	[ContentCommand.loadQuiz](payload) {
		const { loader: loaderType } = payload;
		const quizLoader = new sgQuizLoaders[loaderType](gradingContext.appSettings);
		return quizLoader.getQuiz();
	},

	[ContentCommand.pushSnackbarItem]({ item }) {
		postSnackbarItem(item);
	},
	[ContentCommand.popSnackbarItems]({ itemIds }) {
		removeSnackbarItems(itemIds);
	},

	[ContentCommand.reloadAppSettings]() {
		(async () => {
			gradingContext.appSettings = await AppSettingsLocalStore.getAll();
		})().catch((error) => {
			console.error('Failed to reload app settings:', error);
			postSnackbarItem({
				message:
					'An error occurred while reloading app settings, please refresh the page.',
				closeReason: 'manual',
			});
		});
	},
});

if (import.meta.env.DEV || document.URL.match(Patterns.SG_URL_ORIGIN)) {
	(async () => {
		gradingContext.appSettings = await AppSettingsLocalStore.getAll();

		const injector = quizInjectors[gradingContext.appSettings.defaultQuizInjector];
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
