import Question from '#models/Question';
import type { CanvasQuiz, CanvasQuizQuestion } from '#schemas/CanvasQuiz.schema';
import CanvasAPI from '#shared/CanvasAPI';
import type { AppSettings } from '#shared/settings';
import QuizLoader from '#shared/types/loader';
import type { Nullable } from '#shared/types/utils';
import * as cheerio from 'cheerio';
import type { QuizLoaderPayload } from './loader';

export default class CanvasQuizLoader extends QuizLoader<'canvasAPI'> {
	private accessToken: Nullable<string>;
	private canvasQuiz: Nullable<CanvasQuiz>;
	private canvasQuizQuestions: Nullable<CanvasQuizQuestion[]>;

	public constructor(appSettings: AppSettings, payload: QuizLoaderPayload['canvasAPI']) {
		super(appSettings, payload);
		this.accessToken = appSettings.canvasAccessToken;
		this.canvasQuiz = null;
		this.canvasQuizQuestions = null;
	}

	private getAccessToken() {
		if (this.accessToken === null) {
			throw new Error('Missing Canvas access token.');
		}
		return this.accessToken;
	}

	public set setAccessToken(accessToken: string) {
		this.accessToken = accessToken;
	}

	private get canvasAPI() {
		return new CanvasAPI(this.appSettings.canvasBaseURL, this.getAccessToken());
	}

	private async getCanvasQuiz(): Promise<CanvasQuiz> {
		if (!this.canvasQuiz) {
			this.canvasQuiz = await this.canvasAPI.getQuiz(
				this.getCourseId(),
				this.getQuizId()
			);
		}
		return this.canvasQuiz;
	}

	private async getCanvasQuizQuestions(): Promise<CanvasQuizQuestion[]> {
		if (!this.canvasQuizQuestions) {
			this.canvasQuizQuestions = await this.canvasAPI.getQuizQuestions(
				this.getCourseId(),
				this.getQuizId()
			);
		}
		return this.canvasQuizQuestions;
	}

	public override async getTitle() {
		return (await this.getCanvasQuiz()).title;
	}

	public override async getCanonicalURL() {
		return (await this.getCanvasQuiz()).speed_grader_url;
	}

	public override getCourseId() {
		return this.payload.courseId;
	}

	public override getQuizId() {
		return this.payload.quizId;
	}

	public override async getQuestions() {
		return (await this.getCanvasQuizQuestions()).map((quizQuestion) =>
			Question.create({
				id: `question_${quizQuestion.id}`,
				body: cheerio.load(quizQuestion.question_text, null, false).text(),
				type: quizQuestion.question_type,
				points: quizQuestion.points_possible.toString(),
			})
		);
	}
}
