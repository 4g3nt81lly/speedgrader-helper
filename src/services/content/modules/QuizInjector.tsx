import { SubmissionEventProxy, ToplevelEventProxy } from '#content/EventProxy';
import gradingContext from '#content/GradingContext';
import { injectReactShadowDOM } from '#content/inject';
import Selectors from '#content/selectors';
import GradingBox from '#content/ui/GradingBox';
import QuestionNavBar from '#content/ui/QuestionNavBar';
import type { ISnackbarItem } from '#content/ui/snackbar';
import { Snackbar, postSnackbarItem } from '#content/ui/snackbar';
import type { QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import Constants from '#shared/constants';
import QuizFeedbackLocalStore from '#shared/stores/QuizFeedbackLocalStore';
import QuizLocalStore from '#shared/stores/QuizLocalStore';
import type { Nullable, SetOptional } from '#shared/types/utils';
import { getElementByQuerySelector } from '#shared/utils';

export abstract class QuizInjector {
	protected canonicalUrl: string;

	public constructor(canonicalUrl: string) {
		this.canonicalUrl = canonicalUrl;
	}

	public abstract inject(): Promise<void>;

	protected abstract get selectors(): object;
}

export class OldSGQuizInjector extends QuizInjector {
	protected submissionIframe: Nullable<HTMLIFrameElement> = null;

	public override async inject() {
		try {
			injectReactShadowDOM(document.body, <Snackbar />, { hostId: Selectors.app.SNACKBAR_ROOT_ID });

			await this.registerInjectOnLoad();
		} catch (error) {
			console.error('Fatal error:', error);
			postSnackbarItem({
				message: `Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}.`,
			});
		}
	}

	protected async registerInjectOnLoad() {
		const submissionIframeHolder = await getElementByQuerySelector<HTMLElement>(
			this.selectors.SUBMISSION_IFRAME_HOLDER,
			document,
			{ timeout: 5 * Constants.SECOND_MS }
		);
		if (!submissionIframeHolder) {
			return this.postErrorItem({
				message: 'SpeedGrader not found in reasonable time. Reload page to try again!',
			});
		}
		// Start looking for the submission iframe immediately
		const submissionIframe = submissionIframeHolder.querySelector<HTMLIFrameElement>(
			this.selectors.SUBMISSION_IFRAME
		);
		if (submissionIframe?.contentDocument?.readyState === 'complete') {
			// Submission iframe already loaded, execute injection handler right away
			this.submissionIframe = submissionIframe;
			await this.handleInject();
		}
		const onLoadHandler = this.handleInject.bind(this);
		// Add mutation observer to continuously registering onload handler
		const mutationObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.addedNodes.length === 0) continue;
				for (const node of mutation.addedNodes) {
					if (
						!(node instanceof HTMLIFrameElement) ||
						!node.matches(this.selectors.SUBMISSION_IFRAME)
					) {
						continue;
					}
					console.log('Submission iframe added, registering injection handler...');
					this.submissionIframe = node;
					this.submissionIframe.removeEventListener('load', onLoadHandler);
					this.submissionIframe.addEventListener('load', onLoadHandler);
					return;
				}
			}
		});
		mutationObserver.observe(submissionIframeHolder, { childList: true });
	}

	private async handleInject() {
		console.log('Attempting to perform injection...');
		try {
			await this.initializeGradingContext();

			OldSGQuizInjector.registerEventProxies();

			await this.injectGradingControls();
		} catch (error) {
			this.postErrorItem({
				message: `An unexpected error has occurred while injecting: ${error instanceof Error ? error.message : 'Unknown error'}.`,
			});
		}
	}

	protected async initializeGradingContext() {
		gradingContext.reset();

		const submissionId = new URL(document.URL).searchParams.get('student_id');
		if (submissionId === null) {
			return this.postErrorItem({
				message: `Failed to extract submission ID from "${document.URL}".`,
			});
		}
		const quiz = await QuizLocalStore.getQuizByUrl(this.canonicalUrl);
		if (!quiz) return;

		const submissionWindow = this.submissionIframe!.contentWindow;
		if (!submissionWindow) {
			return this.postErrorItem({ message: 'Fatal: SpeedGrader submission window not found.' });
		}
		const submissionForm = submissionWindow.document.querySelector<HTMLFormElement>(
			this.selectors.SUBMISSION_FORM
		);
		if (!submissionForm) {
			return this.postErrorItem({ message: 'Fatal: SpeedGrader submission form not found.' });
		}

		gradingContext.quiz = quiz;
		gradingContext.lastGradedQuestionId = await QuizLocalStore.getQuizLastGradedQuestionId(
			quiz.id
		).catch((error) => {
			postSnackbarItem({
				message: `Unable to load last-graded question: ${error.message}`,
				type: 'warning',
			});
			return null;
		});
		gradingContext.submissionId = submissionId;
		gradingContext.submissionWindow = submissionWindow;
		gradingContext.submissionForm = submissionForm;
	}

	protected static registerEventProxies() {
		if (!gradingContext.quiz?.isEnabled) return;

		if (!document.getElementById(Selectors.app.EVENT_PROXY_ID)) {
			injectReactShadowDOM(document.body, <ToplevelEventProxy />, {
				hostId: Selectors.app.EVENT_PROXY_ID,
			});
		}
		const submissionDocument = gradingContext.submissionWindow.document;
		if (!submissionDocument.getElementById(Selectors.app.EVENT_PROXY_ID)) {
			injectReactShadowDOM(submissionDocument.body, <SubmissionEventProxy />, {
				hostId: Selectors.app.EVENT_PROXY_ID,
			});
		}
	}

	protected async injectGradingControls() {
		if (!gradingContext.quiz?.isEnabled) return;

		const submissionFeedback = await QuizFeedbackLocalStore.getStoreQuizSubmissionFeedback(
			gradingContext.quiz.id,
			gradingContext.submissionId
		).catch((error) => {
			postSnackbarItem({
				message: `Unable to load saved feedback: ${error.message}`,
				type: 'warning',
			});
			return null;
		});

		for (const question of gradingContext.quiz.questions) {
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
		if (!gradingContext.quiz) return;

		const questionContainer = gradingContext.submissionWindow.document.getElementById(question.id);
		if (!questionContainer) return;

		const textElement = questionContainer?.querySelector(this.selectors.QUESTION_TEXT);
		const pointsInput = questionContainer?.querySelector<HTMLInputElement>(
			this.selectors.QUESTION_POINTS_INPUT
		);
		const hiddenPointsInput = questionContainer?.querySelector<HTMLInputElement>(
			this.selectors.QUESTION_HIDDEN_POINTS_INPUT
		);
		const commentsTextarea = questionContainer?.querySelector<HTMLTextAreaElement>(
			this.selectors.QUESTION_COMMENTS_TEXTAREA
		);
		if (!textElement || !pointsInput || !hiddenPointsInput || !commentsTextarea) return;
		gradingContext.submissionFormFields.set(question.id, {
			pointsField: hiddenPointsInput.name,
			commentsField: commentsTextarea.name,
		});

		this.injectQuestionNavBar(question, questionContainer);

		injectReactShadowDOM(
			textElement,
			<GradingBox
				initialQuestion={question}
				initialFeedback={questionFeedback}
				questionContainer={questionContainer}
				pointsInput={pointsInput}
				commentsTextarea={commentsTextarea}
			/>
		);
	}

	protected injectQuestionNavBar(question: IQuestion, questionContainer: HTMLElement) {
		const questionHeader = questionContainer.querySelector<HTMLElement>(
			this.selectors.QUESTION_HEADER
		);
		if (!questionHeader) return;

		questionHeader.style.position = 'relative';

		injectReactShadowDOM(questionHeader, <QuestionNavBar question={{ id: question.id }} />);
	}

	protected postErrorItem(item: SetOptional<Omit<ISnackbarItem, 'type'>, 'id'>) {
		return postSnackbarItem({ ...item, type: 'error' });
	}

	protected override get selectors() {
		return Selectors.oldSpeedGrader;
	}
}

export class NewSGQuizInjector extends OldSGQuizInjector {
	protected override get selectors() {
		return Selectors.newSpeedGrader;
	}
}
