import type { QuestionFeedback } from '~/models/Feedback';
import type { IQuestion } from '~/models/Question';
import { type IQuiz } from '~/models/Quiz';
import Constants from '~/shared/constants';
import { quizLoaders } from '~/shared/modules';
import QuizFeedbackLocalStore from '~/shared/stores/QuizFeedbackLocalStore';
import QuizLocalStore from '~/shared/stores/QuizLocalStore';
import { getElementByQuerySelector } from '~/shared/utils';
import type { ISnackbarItem } from '~/types/snackbar';
import type { Nullable, SetOptional } from '~/types/utils';
import EventProxy from './EventProxy';
import gradingContext from './GradingContext';
import { injectReactShadowDOM } from './inject';
import { type QuizLoader } from './QuizLoader';
import Selectors from './selectors';
import GradingBox from './ui/GradingBox';
import QuestionNavBar from './ui/QuestionNavBar';
import Snackbar, { postSnackbarItem } from './ui/Snackbar';

export interface QuizInjectorPayload {}

export abstract class QuizInjector {
	public static readonly name: string;

	protected readonly quizLoader: QuizLoader;

	protected quiz: Nullable<IQuiz>;

	public constructor() {
		this.quizLoader = new quizLoaders[gradingContext.appSettings.defaultQuizLoader]();
		this.quiz = null;
	}

	public abstract inject(payload?: QuizInjectorPayload, ...args: any[]): Promise<void>;

	protected abstract get selectors(): object;
}

export class OldSGQuizInjector extends QuizInjector {
	public static override readonly name: string = 'Old SG';

	protected canonicalUrl!: string;
	protected submissionId: Nullable<string> = null;
	protected submissionIframeHolder: Nullable<HTMLElement> = null;

	protected submissionIframe: Nullable<HTMLIFrameElement> = null;

	public override async inject() {
		injectReactShadowDOM(document.body, <Snackbar />);
		try {
			this.canonicalUrl = this.quizLoader.getCanonicalURL();

			await this.registerInjectOnLoad();
		} catch (error) {
			postSnackbarItem({
				message: `An unexpected error has occurred while performing injection: ${error}`,
			});
		}
	}

	private async handleInject() {
		console.log('Attempting to perform injection...');

		this.submissionId = new URL(document.URL).searchParams.get('student_id');
		if (this.submissionId === null) {
			return this.postErrorItem({
				message: `Failed to extract submission ID from "${document.URL}"`,
			});
		}
		try {
			this.quiz = await QuizLocalStore.getQuizByUrl(this.canonicalUrl);
			await this.initializeGradingContext();
			if (this.quiz) {
				this.registerEventProxy();
				await this.injectGradingControls();
			}
		} catch (error) {
			this.postErrorItem({ message: (error as Error).message });
		}
	}

	protected async registerInjectOnLoad() {
		this.submissionIframeHolder = await getElementByQuerySelector<HTMLElement>(
			this.selectors.SUBMISSION_IFRAME_HOLDER,
			document,
			{ timeout: 5 * Constants.SECOND_MS }
		);
		if (!this.submissionIframeHolder) {
			return this.postErrorItem({
				message: 'SpeedGrader not found in reasonable time. Reload page to try again!',
			});
		}
		// Start looking for the submission iframe immediately
		const submissionIframe = this.submissionIframeHolder.querySelector<HTMLIFrameElement>(
			this.selectors.SUBMISSION_IFRAME
		);
		if (submissionIframe?.contentDocument?.readyState === 'complete') {
			// Submission iframe already loaded, execute injection handler right away
			this.submissionIframe = submissionIframe;
			await this.handleInject();
		}
		// Add mutation observer to continuously registering onload handler
		const mutationObserver = new MutationObserver((mutations) => {
			if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
				// Some nodes were added to subtree, check if submission iframe can be found
				const submissionIframe = this.submissionIframeHolder!.querySelector<HTMLIFrameElement>(
					this.selectors.SUBMISSION_IFRAME
				);
				if (submissionIframe) this.submissionIframe = submissionIframe;
				if (submissionIframe?.onload) return;

				console.log('Submission iframe added, registering injection handler...');
				submissionIframe!.onload = () => this.handleInject();
			}
		});
		mutationObserver.observe(this.submissionIframeHolder, { childList: true });
	}

	protected registerEventProxy() {
		const submissionDocument = this.submissionIframe!.contentDocument!;
		injectReactShadowDOM(submissionDocument.body, <EventProxy />, { document: submissionDocument });
	}

	protected async initializeGradingContext() {
		gradingContext.quiz = this.quiz;

		gradingContext.submissionWindow = this.submissionIframe!.contentWindow!;
		gradingContext.submissionForm =
			this.submissionIframe!.contentDocument!.querySelector<HTMLFormElement>(
				this.selectors.SUBMISSION_FORM
			);
		gradingContext.dirtyQuestions.clear();
		gradingContext.isFeedbackSubmitting = false;

		if (!gradingContext.submissionForm) {
			return this.postErrorItem({ message: `Error: SpeedGrader submission form not found.` });
		}
		if (!this.quiz) return;

		const lastGradedQuestionId = await QuizLocalStore.getQuizLastGradedQuestionId(
			this.quiz.id
		).catch((error) => {
			postSnackbarItem({
				message: `Unable to load last-graded question: ${error.message}`,
				type: 'warning',
			});
			return null;
		});
		gradingContext.lastGradedQuestionId = lastGradedQuestionId;
	}

	protected async injectGradingControls() {
		const quiz = this.quiz!;

		const submissionFeedback = await QuizFeedbackLocalStore.getStoreQuizSubmissionFeedback(
			quiz.id,
			this.submissionId!
		).catch((error) => {
			postSnackbarItem({
				message: `Unable to load saved feedback: ${error.message}`,
				type: 'warning',
			});
			return null;
		});

		for (const question of quiz.questions) {
			this.injectQuestionGradingControls(
				question,
				submissionFeedback?.questions[question.id] ?? null
			);
		}
	}

	protected injectQuestionGradingControls(
		question: IQuestion,
		questionFeedback: Nullable<QuestionFeedback>
	) {
		const submissionDocument = this.submissionIframe!.contentDocument!;

		const questionContainer = submissionDocument.getElementById(question.id);
		if (!questionContainer) return;

		const textElement = questionContainer?.querySelector(this.selectors.QUESTION_TEXT);
		const pointsInput = questionContainer?.querySelector<HTMLInputElement>(
			this.selectors.QUESTION_POINTS_INPUT
		);
		const commentsTextarea = questionContainer?.querySelector<HTMLTextAreaElement>(
			this.selectors.QUESTION_COMMENTS_TEXTAREA
		);
		if (!textElement || !pointsInput || !commentsTextarea) return;

		this.injectQuestionNavBar(question, questionContainer);

		injectReactShadowDOM(
			textElement,
			<GradingBox
				submissionId={this.submissionId!}
				initialQuiz={this.quiz!}
				initialQuestion={question}
				initialFeedback={questionFeedback}
				questionContainer={questionContainer}
				pointsInput={pointsInput}
				commentsTextarea={commentsTextarea}
			/>,
			{ document: submissionDocument }
		);
	}

	protected injectQuestionNavBar(question: IQuestion, questionContainer: HTMLElement) {
		const questionHeader = questionContainer.querySelector<HTMLElement>(
			this.selectors.QUESTION_HEADER
		);
		if (!questionHeader) return;

		questionHeader.style.position = 'relative';

		injectReactShadowDOM(questionHeader, <QuestionNavBar question={{ id: question.id }} />, {
			document: this.submissionIframe!.contentDocument!,
		});
	}

	protected postErrorItem(item: SetOptional<Omit<ISnackbarItem, 'type'>, 'id'>) {
		return postSnackbarItem({ ...item, type: 'error' });
	}

	protected override get selectors() {
		return Selectors.oldSpeedGrader;
	}
}

export class NewSGQuizInjector extends OldSGQuizInjector {
	public static override readonly name: string = 'New SG (Experimental)';

	protected override get selectors() {
		return Selectors.newSpeedGrader;
	}
}
