import type { IQuestion } from '~/models/Question';
import Question, { QuestionType } from '~/models/Question';
import type { IQuiz } from '~/models/Quiz';
import Quiz from '~/models/Quiz';
import Patterns from '~/shared/patterns';
import { getBaseUrl } from '~/shared/utils';
import Selectors from './selectors';

export interface QuizLoaderPayload {}

export abstract class QuizLoader {
	public static readonly name: string;

	public abstract validateURL(payload?: QuizLoaderPayload, ...args: any[]): boolean;

	public abstract getTitle(payload?: QuizLoaderPayload, ...args: any[]): string;

	public abstract getCanonicalURL(payload?: QuizLoaderPayload, ...args: any[]): string;

	public abstract getCourseId(payload?: QuizLoaderPayload, ...args: any[]): string;

	public abstract getAssignmentId(payload?: QuizLoaderPayload, ...args: any[]): string;

	public abstract getQuestions(payload?: QuizLoaderPayload, ...args: any[]): IQuestion[];

	public getQuiz(payload: QuizLoaderPayload = {}, ...args: any[]): IQuiz {
		// Validate site origin before loading quiz from content
		if (!this.validateURL(payload, ...args)) {
			throw new Error(`Unrecognized URL: ${getBaseUrl(document.URL)}`);
		}
		const title = this.getTitle(payload, ...args);
		const url = this.getCanonicalURL(payload, ...args);
		const courseId = this.getCourseId(payload, ...args);
		const assignmentId = this.getAssignmentId(payload, ...args);
		const questions = this.getQuestions(payload, ...args);

		return Quiz.create({ title, courseId, assignmentId, url, questions });
	}
}

export class OldSGQuizLoader extends QuizLoader {
	public static override readonly name: string = 'Old SG';

	private static readonly assignmentIdKey = 'assignment_id';

	public override validateURL() {
		const url = new URL(document.URL);
		if (import.meta.env.DEV) return true;
		return (
			Patterns.SG_URL_ORIGIN.test(url.origin) &&
			Patterns.SG_URL_PATHNAME.test(url.pathname)
		);
	}

	public override getTitle() {
		const title = document.title.match(
			/^(?<quizTitle>.*), SpeedGrader, (?<courseName>.*)$/
		)?.groups?.quizTitle;
		if (title === undefined) {
			throw new Error('Failed to extract quiz title');
		}
		return title;
	}

	public static getCanonicalURL(url: string) {
		const inputUrl = new URL(url);
		const canonicalUrl = new URL(getBaseUrl(url));
		const assignmentId = inputUrl.searchParams.get(this.assignmentIdKey);
		if (assignmentId !== null) {
			canonicalUrl.searchParams.set(this.assignmentIdKey, assignmentId);
		}
		return canonicalUrl.href;
	}

	public override getCanonicalURL() {
		return OldSGQuizLoader.getCanonicalURL(document.URL);
	}

	public override getCourseId() {
		const courseId = new URL(document.URL).pathname.match(Patterns.SG_URL_PATHNAME)
			?.groups?.courseId;
		if (courseId === undefined) {
			throw new Error('Failed to extract course ID from URL origin');
		}
		return courseId;
	}

	public override getAssignmentId() {
		const assignmentId = new URL(document.URL).searchParams.get(
			OldSGQuizLoader.assignmentIdKey
		);
		if (assignmentId === null) {
			throw new Error('Failed to extract assignment ID from URL query parameters');
		}
		if (!assignmentId.match(/^\d+$/)) {
			throw new Error(`Invalid assignment ID "${assignmentId}" in URL query parameters`);
		}
		return assignmentId;
	}

	public override getQuestions() {
		const submissionIframeDocument = document.querySelector<HTMLIFrameElement>(
			this.selectors.SUBMISSION_IFRAME
		)?.contentDocument;
		if (!submissionIframeDocument) {
			throw new Error('Quiz submission iframe not found');
		}
		const submissionForm = submissionIframeDocument.querySelector<HTMLFormElement>(
			this.selectors.SUBMISSION_FORM
		);
		if (!submissionForm) {
			throw new Error('Submission form not found in quiz submission iframe');
		}
		const questionList = submissionForm.querySelector(this.selectors.QUESTION_LIST);
		if (!questionList) {
			throw new Error('Question list not found in quiz grader form');
		}
		const questions: IQuestion[] = [];
		for (const questionContainer of questionList.querySelectorAll(
			this.selectors.QUESTION_CONTAINER
		)) {
			const id = questionContainer.id;
			const body = questionContainer
				.querySelector(`#${id}_question_text`)
				?.textContent?.replace('\n', '  ')
				.trim();
			if (body === undefined) {
				throw new Error('Failed to fetch question body content');
			}
			const type = questionContainer
				.querySelector(this.selectors.QUESTION_TYPE)
				?.textContent?.trim();
			if (type === undefined) {
				throw new Error('Failed to fetch question type');
			}
			const points = questionContainer
				.querySelector(this.selectors.QUESTION_MAX_POINTS)
				?.textContent?.split('/')
				.pop()
				?.trim();
			if (!isFinite(Number(points))) {
				throw new Error('Failed to fetch question points');
			}
			questions.push(
				Question.create({
					id,
					body,
					type: <QuestionType>type,
					points: points!,
				})
			);
		}
		if (questions.length <= 0) {
			throw new Error('No questions found in SpeedGrader');
		}
		return questions;
	}

	public get selectors() {
		return Selectors.oldSpeedGrader;
	}
}

export class NewSGQuizLoader extends OldSGQuizLoader {
	public static override readonly name: string = 'New SG (Experimental)';

	public override get selectors() {
		return Selectors.newSpeedGrader;
	}
}

export const quizLoaderTypes = ['oldSG', 'newSG'] as const;

export type QuizLoaderType = (typeof quizLoaderTypes)[number];

export const quizLoaders: Record<QuizLoaderType, new () => QuizLoader> = {
	oldSG: OldSGQuizLoader,
	newSG: NewSGQuizLoader,
};
