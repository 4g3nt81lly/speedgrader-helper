import { addCommandHandler, ContentCommand } from '#shared/message';
import Patterns from '#shared/patterns';
import { defaultAppSettings } from '#shared/settings';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';
import gradingContext from './GradingContext';
import { quizInjectors, quizLoaders } from './modules';
import { postSnackbarItem, removeSnackbarItems } from './ui/snackbar';

addCommandHandler({
	[ContentCommand.loadQuiz](payload) {
		const { loader: loaderType, payload: loaderPayload } = payload;
		const quizLoader = new quizLoaders[loaderType]();
		const newQuiz = quizLoader.getQuiz(loaderPayload);
		return newQuiz;
	},

	[ContentCommand.pushSnackbarItem]({ item }) {
		postSnackbarItem(item);
	},
	[ContentCommand.popSnackbarItems]({ itemIds }) {
		removeSnackbarItems(itemIds);
	},

	[ContentCommand.reloadAppSettings]() {
		(async () => {
			try {
				gradingContext.appSettings = {
					...defaultAppSettings,
					...(await AppSettingsLocalStore.getAll()),
				};
			} catch (error) {
				postSnackbarItem({
					message:
						'An error occurred while reloading app settings, please refresh the page.',
					closeReason: 'manual',
				});
			}
		})();
	},
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
