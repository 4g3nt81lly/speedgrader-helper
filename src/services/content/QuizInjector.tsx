import { v4 as uuidv4 } from 'uuid';
import type { QuestionFeedback } from '~/models/Feedback';
import type { IQuestion } from '~/models/Question';
import { type IQuiz } from '~/models/Quiz';
import Constants from '~/shared/constants';
import { ContentEvent, dispatchContentEvent } from '~/shared/event';
import QuizFeedbackLocalStore from '~/shared/stores/QuizFeedbackLocalStore';
import QuizLocalStore from '~/shared/stores/QuizLocalStore';
import { getElementByQuerySelector, pushSnackbarItem } from '~/shared/utils';
import type { ISnackbarItem } from '~/types/snackbar';
import type { Constructor, Nullable } from '~/types/utils';
import { injectReactShadowDOM } from './inject';
import { OldSGQuizLoader } from './QuizLoader';
import Selectors from './selectors';
import GradingBox from './ui/GradingBox';
import QuestionNavBar from './ui/QuestionNavBar';
import Snackbar from './ui/Snackbar';

export interface QuizInjectorPayload {}

export abstract class QuizInjector {
	public static readonly name: string;

	public abstract inject(payload: QuizInjectorPayload, ...args: any[]): Promise<void>;

	protected abstract get selectors(): object;
}

export class OldSGQuizInjector extends QuizInjector {
	public override async inject() {
		const initialErrors: ISnackbarItem[] = [];
		try {
			const canonicalUrl = new OldSGQuizLoader().getCanonicalURL();
			const quiz = await QuizLocalStore.getQuizByUrl(canonicalUrl);

			await this.registerInjectOnLoad(quiz, this.handleInject.bind(this));
		} catch (error) {
			initialErrors.push({
				id: uuidv4(),
				message:
					error instanceof Error
						? error.message
						: 'An unexpected error has occurred while performing injection',
				type: 'error',
			});
		} finally {
			// Inject message snackbar with initial injection errors
			injectReactShadowDOM(document.body, <Snackbar initialItems={initialErrors} />);
		}
	}

	private async handleInject(submissionIframe: HTMLIFrameElement, quiz: Nullable<IQuiz>) {
		const submissionDocument = submissionIframe.contentDocument!;

		if (quiz) {
			await this.injectGradingControls(submissionDocument, quiz);
		}

		this.overrideFormSubmissionFlow(submissionDocument);
	}

	protected async registerInjectOnLoad(
		quiz: Nullable<IQuiz>,
		injectionHandler: (submissionIframe: HTMLIFrameElement, quiz: Nullable<IQuiz>) => Promise<void>
	) {
		const wrappedInjectionHandler = async (submissionIframe: HTMLIFrameElement) => {
			console.log('iframe loaded, attempting to perform injection...');
			try {
				await injectionHandler(submissionIframe, quiz);
			} catch (error) {
				pushSnackbarItem({
					message:
						error instanceof Error
							? error.message
							: 'An unexpected error has occurred while performing injection',
					type: 'error',
				});
			}
		};

		const submissionIframeHolder = await getElementByQuerySelector<HTMLElement>(
			this.selectors.SUBMISSION_IFRAME_HOLDER,
			document,
			{ timeout: 5 * Constants.SECOND_MS }
		);
		if (!submissionIframeHolder) {
			throw new Error(
				'Quiz submission iframe holder not found in reasonable time. Please try again by reloading page!'
			);
		}
		// Start looking for the submission iframe immediately
		const submissionIFrame = submissionIframeHolder.querySelector<HTMLIFrameElement>(
			this.selectors.SUBMISSION_IFRAME
		);
		if (submissionIFrame?.contentDocument?.readyState === 'complete') {
			// Submission iframe already loaded, execute injection handler right away
			await wrappedInjectionHandler(submissionIFrame);
		}
		// Add mutation observer to continuously registering onload handler
		const mutationObserver = new MutationObserver((mutations) => {
			if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
				// Some nodes were added to subtree, check if submission iframe can be found
				const submissionIFrame = submissionIframeHolder.querySelector<HTMLIFrameElement>(
					this.selectors.SUBMISSION_IFRAME
				);
				if (!submissionIFrame || submissionIFrame.onload) return;

				console.log('Submission iframe added, registering injection handler...');
				submissionIFrame.onload = () => wrappedInjectionHandler(submissionIFrame);
			}
		});
		mutationObserver.observe(submissionIframeHolder, { childList: true });
	}

	protected async injectGradingControls(submissionDocument: Document, quiz: IQuiz) {
		const submissionId = new URL(document.URL).searchParams.get('student_id');
		if (submissionId === null) {
			return console.error(`Failed to extract submission ID from "${document.URL}"`);
		}

		try {
			var initialFeedback = await QuizFeedbackLocalStore.getStoreQuizSubmissionFeedback(
				quiz.id,
				submissionId
			);
			var lastGradedQuestionId = await QuizLocalStore.getQuizLastGradedQuestionId(quiz.id);
		} catch (error) {
			return console.error((error as Error).message);
		}

		for (const question of quiz.questions) {
			this.injectQuestionGradingControls(
				submissionDocument,
				quiz,
				question,
				initialFeedback?.questions[question.id] ?? null,
				submissionId,
				lastGradedQuestionId === question.id
			);
		}
	}

	protected injectQuestionGradingControls(
		submissionDocument: Document,
		initialQuiz: IQuiz,
		initialQuestion: IQuestion,
		initialFeedback: Nullable<QuestionFeedback>,
		submissionId: string,
		scrollIntoView: boolean
	) {
		const questionContainer = submissionDocument.getElementById(initialQuestion.id);
		if (!questionContainer) return;

		const textElement = questionContainer?.querySelector(this.selectors.QUESTION_TEXT);
		const pointsInput = questionContainer?.querySelector<HTMLInputElement>(
			this.selectors.QUESTION_POINTS_INPUT
		);
		const commentsTextarea = questionContainer?.querySelector<HTMLTextAreaElement>(
			this.selectors.QUESTION_COMMENTS_TEXTAREA
		);
		if (!textElement || !pointsInput?.form || !commentsTextarea) return;

		pointsInput.readOnly = true;
		commentsTextarea.readOnly = true;

		this.injectQuestionNavBar(
			submissionDocument,
			initialQuiz,
			initialQuestion,
			questionContainer,
			pointsInput.form
		);

		injectReactShadowDOM(
			textElement,
			<GradingBox
				submissionId={submissionId}
				initialQuiz={initialQuiz}
				initialQuestion={initialQuestion}
				initialFeedback={initialFeedback}
				questionContainer={questionContainer}
				pointsInput={pointsInput}
				commentsTextarea={commentsTextarea}
				scrollIntoView={scrollIntoView}
			/>,
			{ document: submissionDocument }
		);
	}

	protected injectQuestionNavBar(
		submissionDocument: Document,
		initialQuiz: IQuiz,
		initialQuestion: IQuestion,
		questionContainer: HTMLElement,
		gradingForm: HTMLFormElement
	) {
		const questionHeader = questionContainer.querySelector<HTMLElement>(
			this.selectors.QUESTION_HEADER
		);
		if (!questionHeader) return;

		questionHeader.style.position = 'relative';

		injectReactShadowDOM(
			questionHeader,
			<QuestionNavBar
				quizId={initialQuiz.id}
				question={{ id: initialQuestion.id }}
				gradingForm={gradingForm}
			/>,
			{ document: submissionDocument }
		);
	}

	protected overrideFormSubmissionFlow(submissionDocument: Document) {
		const submissionForm = submissionDocument.querySelector<HTMLFormElement>(
			this.selectors.SUBMISSION_FORM
		);
		if (!submissionForm) return;

		submissionForm.addEventListener('submit', async (event) => {
			// Prevent default form submission flow
			event.preventDefault();
			// Prevent other submit event handlers from running
			event.stopImmediatePropagation();
			// Prevent event handlers registered on ancestors from running
			event.stopPropagation();

			// Manually submit using form data
			try {
				var response = await fetch(submissionForm.action, {
					method: submissionForm.method,
					body: new FormData(submissionForm),
					redirect: 'follow',
				});
			} catch (error) {
				console.error('Failed to submit form data:', error);
				return pushSnackbarItem(
					{
						title: 'Save Error',
						message: 'Unable to submit feedback. Please refresh the page and try again!',
						type: 'error',
						closeReason: 'manual',
					},
					'iframe'
				);
			}
			if (response.ok) {
				// Refresh grades and update stats in SpeedGrader header
				dispatchContentEvent(ContentEvent.refreshGrades, {}, window.parent);
				// Notify grading boxes to serialize and save feedback states to local storage
				dispatchContentEvent(ContentEvent.saveQuestionFeedback);
				pushSnackbarItem(
					{
						message: 'Successfully submitted feedback!',
						type: 'success',
						timeoutMs: 2 * Constants.SECOND_MS,
					},
					'iframe'
				);
			} else {
				pushSnackbarItem(
					{
						message: 'Unable to submit feedback. Please refresh the page and try again!',
						type: 'error',
						timeoutMs: 3 * Constants.SECOND_MS,
					},
					'iframe'
				);
			}
			// Notify any context that might be interested in this event, both within and outside the submission iframe
			dispatchContentEvent(ContentEvent.gradeSubmissionComplete, { success: response.ok });
			if (window.parent !== window) {
				dispatchContentEvent(
					ContentEvent.gradeSubmissionComplete,
					{ success: response.ok },
					window.parent
				);
			}
		});
	}

	protected override get selectors() {
		return Selectors.oldSpeedGrader;
	}
}

export class NewSGQuizLoader extends OldSGQuizInjector {
	protected override get selectors() {
		return Selectors.newSpeedGrader;
	}
}

export const quizInjectorTypes = ['oldSpeedGrader', 'newSpeedGrader'] as const;

export type QuizInjectorType = (typeof quizInjectorTypes)[number];

export const quizInjectors: Record<QuizInjectorType, Constructor<QuizInjector>> = {
	oldSpeedGrader: OldSGQuizInjector,
	newSpeedGrader: NewSGQuizLoader,
};
