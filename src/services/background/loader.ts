import type { IQuiz } from '#models/Quiz';
import { sendMessageToTab } from '#shared/message';
import AppSettingsSyncStorage from '#shared/storage/AppSettings';
import type { QuizLoaderPayload, QuizLoaderType } from '#shared/types/loader';
import CanvasQuizLoader from './CanvasQuizLoader';

const quizLoadHandler: {
	[Loader in QuizLoaderType]: (payload: QuizLoaderPayload[Loader]) => Promise<IQuiz>;
} = {
	async oldSG() {
		return sendMessageToTab(
			{ name: 'quiz.load', loader: 'oldSG' },
			{ timeout: { seconds: 5 }, throwOnNoReceiver: true }
		);
	},
	async newSG() {
		return sendMessageToTab(
			{ name: 'quiz.load', loader: 'newSG' },
			{ timeout: { seconds: 5 }, throwOnNoReceiver: true }
		);
	},
	async canvasAPI(payload) {
		const appSettings = await AppSettingsSyncStorage.getAll();
		const loader = new CanvasQuizLoader(appSettings, payload);
		return loader.getQuiz();
	},
};

export async function loadQuiz<Type extends QuizLoaderType>(
	type: Type,
	payload: QuizLoaderPayload[Type]
) {
	return quizLoadHandler[type](payload);
}
