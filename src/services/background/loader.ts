import type { IQuiz } from '#models/Quiz';
import Constants from '#shared/constants';
import { sendMessageToTab } from '#shared/message';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';
import type { QuizLoaderPayload, QuizLoaderType } from '#shared/types/loader';
import { ContentCommand } from '#shared/types/message';
import CanvasQuizLoader from './CanvasQuizLoader';

export const quizLoadHandler: {
	[Loader in QuizLoaderType]: (
		...payload: QuizLoaderPayload[Loader] extends undefined
			? []
			: [QuizLoaderPayload[Loader]]
	) => Promise<IQuiz>;
} = {
	async oldSG() {
		return sendMessageToTab(
			{ command: ContentCommand.loadQuiz, loader: 'oldSG' },
			{ timeout: { milliseconds: 5 * Constants.SECOND_MS }, throwOnNoReceiver: true }
		);
	},
	async newSG() {
		return sendMessageToTab(
			{ command: ContentCommand.loadQuiz, loader: 'newSG' },
			{ timeout: { milliseconds: 5 * Constants.SECOND_MS }, throwOnNoReceiver: true }
		);
	},
	async canvasAPI(payload) {
		const appSettings = await AppSettingsLocalStore.getAll();
		const loader = new CanvasQuizLoader(appSettings, payload);
		return loader.getQuiz();
	},
};
