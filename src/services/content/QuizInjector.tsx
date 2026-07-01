import { v4 as uuidv4 } from 'uuid';
import type { QuestionFeedback } from '~/models/Feedback';
import type { IQuestion } from '~/models/Question';
import { type IQuiz } from '~/models/Quiz';
import Constants from '~/shared/constants';
import { defaultAppSettings, type AppSettings } from '~/shared/settings';
import QuizFeedbackLocalStore from '~/shared/stores/QuizFeedbackLocalStore';
import QuizLocalStore from '~/shared/stores/QuizLocalStore';
import { getElementByQuerySelector, pushSnackbarItem } from '~/shared/utils';
import type { ISnackbarItem } from '~/types/snackbar';
import type { Nullable, SetOptional } from '~/types/utils';
import EventProxy from './EventProxy';
import globals from './global';
import { injectReactShadowDOM } from './inject';
import { quizLoaders, type QuizLoader } from './QuizLoader';
import Selectors from './selectors';
import GradingBox from './ui/GradingBox';
import QuestionNavBar from './ui/QuestionNavBar';
import Snackbar from './ui/Snackbar';

export interface QuizInjectorPayload {}

export abstract class QuizInjector {
	public static readonly name: string;

	protected readonly appSettings: AppSettings;
	protected readonly quizLoader: QuizLoader;

	protected quiz: Nullable<IQuiz>;

	public constructor(appSettings: Partial<AppSettings>) {
		this.appSettings = { ...defaultAppSettings, ...appSettings };
		this.quizLoader = new quizLoaders[
			appSettings.defaultQuizLoader ?? defaultAppSettings.defaultQuizLoader
		]();
		this.quiz = null;
	}

	public abstract inject(payload?: QuizInjectorPayload, ...args: any[]): Promise<void>;

	protected abstract get selectors(): object;
}

export class OldSGQuizInjector extends QuizInjector {
	public static override readonly name: string = 'Old SG';

	protected submissionId: Nullable<string> = null;
	protected submissionIframeHolder: Nullable<HTMLElement> = null;

	protected submissionIframe: Nullable<HTMLIFrameElement> = null;

	public override async inject() {
		const initialItems: ISnackbarItem[] = [];
		try {
			const canonicalUrl = this.quizLoader.getCanonicalURL();
			this.quiz = await QuizLocalStore.getQuizByUrl(canonicalUrl);

			await this.registerInjectOnLoad(initialItems);
		} catch (error) {
			this.postSnackbarItem(
				{ message: `An unexpected error has occurred while performing injection: ${error}` },
				initialItems
			);
		} finally {
			// Inject message snackbar with initial injection errors
			injectReactShadowDOM(document.body, <Snackbar initialItems={initialItems} />);
		}
	}

	private async handleInject(snackbarItems?: ISnackbarItem[]) {
		console.log('Attempting to perform injection...');

		const gradingForm = this.submissionIframe!.contentDocument!.querySelector<HTMLFormElement>(
			this.selectors.SUBMISSION_FORM
		);
		if (!gradingForm) {
			return this.postErrorItem(
				{ message: `Error: SpeedGrader submission form not found.` },
				snackbarItems
			);
		}
		try {
			this.registerEventProxy(gradingForm);
			if (this.quiz) {
				await this.injectGradingControls(snackbarItems);
			}
		} catch (error) {
			this.postErrorItem({ message: (error as Error).message }, snackbarItems);
		}
	}

	protected async registerInjectOnLoad(snackbarItems: ISnackbarItem[]) {
		this.submissionId = new URL(document.URL).searchParams.get('student_id');
		if (this.submissionId === null) {
			return this.postErrorItem(
				{ message: `Failed to extract submission ID from "${document.URL}"` },
				snackbarItems
			);
		}
		this.submissionIframeHolder = await getElementByQuerySelector<HTMLElement>(
			this.selectors.SUBMISSION_IFRAME_HOLDER,
			document,
			{ timeout: 5 * Constants.SECOND_MS }
		);
		if (!this.submissionIframeHolder) {
			return this.postErrorItem(
				{ message: 'SpeedGrader not found in reasonable time. Reload page to try again!' },
				snackbarItems
			);
		}
		// Start looking for the submission iframe immediately
		const submissionIframe = this.submissionIframeHolder.querySelector<HTMLIFrameElement>(
			this.selectors.SUBMISSION_IFRAME
		);
		if (submissionIframe?.contentDocument?.readyState === 'complete') {
			// Submission iframe already loaded, execute injection handler right away
			this.submissionIframe = submissionIframe;
			await this.handleInject(snackbarItems);
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

	protected registerEventProxy(gradingForm: HTMLFormElement) {
		const submissionDocument = this.submissionIframe!.contentDocument!;
		injectReactShadowDOM(
			submissionDocument.body,
			<EventProxy
				initialAppSettings={this.appSettings}
				iframeWindow={this.submissionIframe!.contentWindow!}
				gradingForm={gradingForm}
			/>,
			{ document: submissionDocument }
		);
	}

	protected async injectGradingControls(snackbarItems?: ISnackbarItem[]) {
		const quiz = this.quiz!;
		globals.quizId = quiz.id;

		const submissionFeedback = await QuizFeedbackLocalStore.getStoreQuizSubmissionFeedback(
			quiz.id,
			this.submissionId!
		).catch((error) => {
			this.postSnackbarItem(
				{ message: `Unable to load saved feedback: ${error.message}`, type: 'warning' },
				snackbarItems
			);
			return null;
		});
		const lastGradedQuestionId = await QuizLocalStore.getQuizLastGradedQuestionId(quiz.id).catch(
			(error) => {
				this.postSnackbarItem(
					{ message: `Unable to load last-graded question: ${error.message}`, type: 'warning' },
					snackbarItems
				);
				return null;
			}
		);
		globals.quizLastGradedQuestionId = lastGradedQuestionId;

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
		if (!textElement || !pointsInput?.form || !commentsTextarea) return;

		pointsInput.readOnly = true;
		commentsTextarea.readOnly = true;

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
				iframeWindow={this.submissionIframe!.contentWindow!}
				appSettings={this.appSettings}
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

		injectReactShadowDOM(
			questionHeader,
			<QuestionNavBar
				question={{ id: question.id }}
				iframeWindow={this.submissionIframe!.contentWindow!}
			/>,
			{ document: this.submissionIframe!.contentDocument! }
		);
	}

	protected postErrorItem(
		item: SetOptional<Omit<ISnackbarItem, 'type'>, 'id'>,
		initialItems?: ISnackbarItem[]
	) {
		return this.postSnackbarItem({ ...item, type: 'error' }, initialItems);
	}

	protected postSnackbarItem(
		item: SetOptional<ISnackbarItem, 'id'>,
		initialItems?: ISnackbarItem[]
	) {
		if (initialItems) {
			initialItems.push({ id: uuidv4(), ...item });
		} else {
			pushSnackbarItem(item);
		}
	}

	protected override get selectors() {
		return Selectors.oldSpeedGrader;
	}
}

export class NewSGQuizLoader extends OldSGQuizInjector {
	public static override readonly name: string = 'New SG (Experimental)';

	protected override get selectors() {
		return Selectors.newSpeedGrader;
	}
}

export const quizInjectorTypes = ['oldSG', 'newSG'] as const;

export type QuizInjectorType = (typeof quizInjectorTypes)[number];

export const quizInjectors: Record<
	QuizInjectorType,
	new (appSettings: Partial<AppSettings>) => QuizInjector
> = {
	oldSG: OldSGQuizInjector,
	newSG: NewSGQuizLoader,
};
