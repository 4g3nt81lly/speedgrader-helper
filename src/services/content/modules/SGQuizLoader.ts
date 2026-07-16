import Selectors from '#content/selectors';
import Question, { type IQuestion, type QuestionType } from '#models/Question';
import Patterns from '#shared/patterns';
import type { AppSettings } from '#shared/settings';
import type { SGQuizLoaderType } from '#shared/types/loader';
import QuizLoader from '#shared/types/loader';
import { getBaseUrl } from '#shared/utils/browser/index';
import { isDecimal } from '#shared/utils/decimal';

export abstract class SGQuizLoader<
	Type extends SGQuizLoaderType = SGQuizLoaderType,
> extends QuizLoader<Type> {
	private static readonly quizIdKey = 'assignment_id';

	public static getCanonicalURL(url: string) {
		const inputUrl = new URL(url);
		const canonicalUrl = new URL(getBaseUrl(url));
		const quizId = inputUrl.searchParams.get(this.quizIdKey);
		if (quizId !== null) {
			canonicalUrl.searchParams.set(this.quizIdKey, quizId);
		}
		return canonicalUrl.href;
	}

	public constructor(appSettings: AppSettings) {
		super(appSettings, undefined);
	}

	protected static validateURL(urlString: string) {
		const url = new URL(urlString);
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
			throw new Error('Failed to extract quiz title.');
		}
		return title;
	}

	public override getCanonicalURL() {
		return SGQuizLoader.getCanonicalURL(document.URL);
	}

	public override getCourseId() {
		const courseId = new URL(document.URL).pathname.match(Patterns.SG_URL_PATHNAME)
			?.groups?.courseId;
		if (courseId === undefined) {
			throw new Error('Failed to extract course ID from URL origin.');
		}
		return courseId;
	}

	public override getQuizId() {
		const quizId = new URL(document.URL).searchParams.get(SGQuizLoader.quizIdKey);
		if (quizId === null) {
			throw new Error('Failed to extract Canvas quiz ID from URL query parameters.');
		}
		if (!quizId.match(Patterns.CANVAS_QUIZ_ID)) {
			throw new Error(`Invalid Canvas quiz ID "${quizId}" in URL query parameters.`);
		}
		return quizId;
	}

	public abstract override getQuestions(): IQuestion[];

	public override getQuiz() {
		// Validate site origin before loading quiz from content
		if (!SGQuizLoader.validateURL(document.URL)) {
			throw new Error(`Unrecognized URL: ${getBaseUrl(document.URL)}`);
		}
		return super.getQuiz();
	}
}

export class OldSGQuizLoader extends SGQuizLoader<'oldSG'> {
	public override getQuestions() {
		const submissionIframeDocument = document.querySelector<HTMLIFrameElement>(
			this.selectors.SUBMISSION_IFRAME
		)?.contentDocument;
		if (!submissionIframeDocument) {
			throw new Error('Quiz submission iframe not found.');
		}
		const submissionForm = submissionIframeDocument.querySelector<HTMLFormElement>(
			this.selectors.SUBMISSION_FORM
		);
		if (!submissionForm) {
			throw new Error('Submission form not found in quiz submission iframe.');
		}
		const questionList = submissionForm.querySelector(this.selectors.QUESTION_LIST);
		if (!questionList) {
			throw new Error('Question list not found in quiz grader form.');
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
			if (typeof body !== 'string') {
				throw new Error('Failed to fetch question body content.');
			}
			const type = questionContainer
				.querySelector(this.selectors.QUESTION_TYPE)
				?.textContent?.trim();
			if (typeof type !== 'string') {
				throw new Error('Failed to fetch question type.');
			}
			const points = questionContainer
				.querySelector(this.selectors.QUESTION_MAX_POINTS)
				?.textContent?.split('/')
				.pop()
				?.trim();
			if (!points || !isDecimal(points)) {
				throw new Error('Failed to fetch question points.');
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
		if (questions.length === 0) {
			throw new Error('No questions found in SpeedGrader.');
		}
		return questions;
	}

	public get selectors() {
		return Selectors.oldSpeedGrader;
	}
}

export class NewSGQuizLoader extends OldSGQuizLoader {
	public override get selectors() {
		return Selectors.newSpeedGrader;
	}
}
