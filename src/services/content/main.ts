import { addMessageHandlers } from '#shared/message';
import { reloadPage } from '#shared/utils/browser';
import { TaskQueue } from '#shared/utils/queues';
import actions from './actions';
import Constants from './constants';
import { quizInjectors, sgQuizLoaders } from './modules';
import { SGQuizLoader } from './modules/SGQuizLoader';
import { store } from './stores';

export const queue = new TaskQueue(Constants.MAIN_QUEUE_NAME);

if (SGQuizLoader.validateURL(document.URL)) {
	addMessageHandlers<'content'>({
		'app.reloadSettings'() {
			actions.reloadAppSettings();
		},
		'app.reloadPage'({ urls }) {
			const canonicalUrl = SGQuizLoader.getCanonicalURL(document.URL);
			if (!urls || urls.length === 0 || urls.includes(canonicalUrl)) {
				reloadPage();
			}
		},

		'quiz.load'({ loader }) {
			const quizLoader = new sgQuizLoaders[loader](store.state.appSettings);
			return quizLoader.getQuiz();
		},
		'quiz.reload'() {
			if (!store.state.gradingContext) return;
			actions.gradingContext.reloadQuiz();
		},
	});
	queue
		.run(async () => {
			const appSettings = await actions.loadAppSettings();

			const injector = quizInjectors[appSettings.defaultQuizInjector];
			const canonicalUrl = SGQuizLoader.getCanonicalURL(document.URL);

			await new injector(canonicalUrl).inject();
		})
		.catch((error) => {
			console.error(
				'An error occurred during SGH injection:',
				error instanceof Error ? error.message : 'unknown'
			);
		});
	console.info('SpeedGrader Helper: Content script loaded');
}
