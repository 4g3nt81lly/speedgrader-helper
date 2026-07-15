import type { IQuiz } from '#models/Quiz';
import Constants from '#shared/constants';
import { ContentCommand, sendMessageToTab } from '#shared/message';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';
import CanvasQuizLoader from './CanvasQuizLoader';

export type QuizLoaderPayload = {
	oldSG: undefined;
	newSG: undefined;
	canvasAPI: {
		courseId: string;
		quizId: string;
	};
};

export type QuizLoaderType = keyof QuizLoaderPayload;

export type QuizLoaderPayloadMap = {
	[Loader in QuizLoaderType]: {
		loader: Loader;
	} & (QuizLoaderPayload[Loader] extends undefined
		? { payload?: undefined }
		: { payload: QuizLoaderPayload[Loader] });
};

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
