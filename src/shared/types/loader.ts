import type { IQuestion } from '#models/Question';
import Quiz from '#models/Quiz';
import type { AppSettings } from '#shared/settings';

export type QuizLoaderPayload = {
	oldSG: {};
	newSG: {};
	canvasAPI: {
		courseId: string;
		quizId: string;
	};
};

export type QuizLoaderType = Readonly<keyof QuizLoaderPayload>;

export type QuizLoaderPayloadMap = {
	[Loader in QuizLoaderType]: {
		loader: Loader;
		payload: QuizLoaderPayload[Loader];
	};
};

export default abstract class QuizLoader<Type extends QuizLoaderType = QuizLoaderType> {
	protected appSettings: AppSettings;
	protected payload: QuizLoaderPayload[Type];

	public constructor(appSettings: AppSettings, payload: QuizLoaderPayload[Type]) {
		this.appSettings = appSettings;
		this.payload = payload;
	}

	abstract getTitle(): string | Promise<string>;

	abstract getCanonicalURL(): string | Promise<string>;

	abstract getCourseId(): string | Promise<string>;

	abstract getQuizId(): string | Promise<string>;

	abstract getQuestions(): IQuestion[] | Promise<IQuestion[]>;

	async getQuiz() {
		let canvasId = this.getQuizId();
		if (canvasId instanceof Promise) {
			canvasId = await canvasId;
		}
		let courseId = this.getCourseId();
		if (courseId instanceof Promise) {
			courseId = await courseId;
		}
		let url = this.getCanonicalURL();
		if (url instanceof Promise) {
			url = await url;
		}
		let title = this.getTitle();
		if (title instanceof Promise) {
			title = await title;
		}
		let questions = this.getQuestions();
		if (questions instanceof Promise) {
			questions = await questions;
		}

		return Quiz.create({ canvasId, courseId, url, title, questions });
	}
}

export type SGQuizLoaderType = keyof Pick<QuizLoaderPayload, 'oldSG' | 'newSG'>;
