import { InnerEventProxy, ToplevelEventProxy } from '#content/EventProxy';
import { injectReactShadowDOM } from '#content/inject';
import Selectors from '#content/selectors';
import type { QuestionGradingState } from '#content/stores/QuestionGradingState';
import { createQuestionGradingState } from '#content/stores/gradingStates.actions';
import { useContentStore, type GradingContext } from '#content/stores/main.store';
import { postSnackbarItem, type ISnackbarItem } from '#content/stores/snackbar.store';
import QuestionGradingBox from '#content/ui/QuestionGradingBox';
import QuestionNavBar from '#content/ui/QuestionNavBar';
import Snackbar from '#content/ui/snackbar/Snackbar';
import Constants from '#shared/constants';
import QuizFeedbackLocalStore from '#shared/stores/QuizFeedbackLocalStore';
import QuizLocalStore from '#shared/stores/QuizLocalStore';
import type { Nullable, SetOptional } from '#shared/types/utils';
import { getElementByQuerySelector } from '#shared/utils/browser/index';
import type ReactDOM from 'react-dom/client';

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

	private toplevelEventProxyIsLoaded: boolean = false;
	private innerComponents = new Set<ReactDOM.Root>();

	public override async inject() {
		try {
			injectReactShadowDOM(document.body, <Snackbar />);

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
					console.info('Submission iframe added, registering injection handler...');
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
		console.info('Performing injection...');
		try {
			this.cleanup();
			await this.initializeGradingContext();

			const gradingContext = useContentStore.getState().gradingContext;
			if (!gradingContext) return;

			this.registerEventProxies(gradingContext);
			await this.injectGradingComponents(gradingContext);
		} catch (error) {
			this.postErrorItem({
				message: `An unexpected error has occurred while injecting: ${error instanceof Error ? error.message : 'Unknown error'}.`,
			});
		}
	}

	private cleanup() {
		// Must unmount all components before resetting global grading context
		this.innerComponents.forEach((component) => component.unmount());
		this.innerComponents.clear();
		useContentStore.setState({ gradingContext: null });
	}

	protected async initializeGradingContext() {
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

		const lastGradedQuestionId = await QuizLocalStore.getQuizLastGradedQuestionId(quiz.id).catch(
			(error) => {
				postSnackbarItem({
					message: `Unable to load last-graded question: ${error.message}`,
					type: 'warning',
				});
				return null;
			}
		);
		const gradingContext: GradingContext = {
			quiz,
			gradingStates: {},
			lastGradedQuestionId,
			submissionId,
			submissionWindow,
			submissionForm,
			isFeedbackSubmitting: false,
			submissionFormFields: new Map(),
			dirtyQuestions: new Set(),
		};
		await this.initializeGradingStates(gradingContext);

		for (const [questionId, { sgElements }] of Object.entries(gradingContext.gradingStates)) {
			gradingContext.submissionFormFields.set(questionId, {
				pointsField: sgElements.pointsHiddenInput.name,
				commentsField: sgElements.commentsTextarea.name,
			});
		}
		useContentStore.setState({ gradingContext });
	}

	protected async initializeGradingStates(partialGradingContext: GradingContext) {
		const { quiz, submissionId, submissionWindow } = partialGradingContext;
		const submissionFeedback = await QuizFeedbackLocalStore.getStoreQuizSubmissionFeedback(
			quiz.id,
			submissionId
		).catch((error) => {
			postSnackbarItem({
				message: `Unable to load saved feedback: ${error.message}`,
				type: 'warning',
			});
			return null;
		});
		for (const question of quiz.questions) {
			const questionContainer = submissionWindow.document.getElementById(question.id);
			if (!questionContainer) continue;

			const textElement = questionContainer.querySelector<HTMLElement>(
				this.selectors.QUESTION_TEXT
			);
			const pointsInput = questionContainer.querySelector<HTMLInputElement>(
				this.selectors.QUESTION_POINTS_INPUT
			);
			const pointsHiddenInput = questionContainer.querySelector<HTMLInputElement>(
				this.selectors.QUESTION_HIDDEN_POINTS_INPUT
			);
			const commentsTextarea = questionContainer.querySelector<HTMLTextAreaElement>(
				this.selectors.QUESTION_COMMENTS_TEXTAREA
			);
			if (!textElement || !pointsInput || !pointsHiddenInput || !commentsTextarea) continue;

			partialGradingContext.gradingStates[question.id] = createQuestionGradingState(
				question,
				submissionFeedback?.questions[question.id] ?? null,
				{
					container: questionContainer,
					text: textElement,
					pointsInput,
					pointsHiddenInput,
					commentsTextarea,
				}
			);
		}
	}

	protected registerEventProxies(gradingContext: GradingContext) {
		if (!gradingContext.quiz?.isEnabled) return;

		if (!this.toplevelEventProxyIsLoaded) {
			injectReactShadowDOM(document.body, <ToplevelEventProxy />);
			this.toplevelEventProxyIsLoaded = true;
		}
		const { reactRoot: innerEventProxyRoot } = injectReactShadowDOM(
			gradingContext.submissionWindow.document.body,
			<InnerEventProxy />
		);
		this.innerComponents.add(innerEventProxyRoot);
	}

	protected async injectGradingComponents(gradingContext: GradingContext) {
		if (!gradingContext.quiz?.isEnabled) return;

		for (const gradingState of Object.values(gradingContext.gradingStates)) {
			this.injectQuestionGradingComponents(gradingState);
		}
	}

	protected injectQuestionGradingComponents(state: QuestionGradingState) {
		this.injectQuestionNavBar(state);

		const { reactRoot: gradingBoxRoot } = injectReactShadowDOM(
			state.sgElements.text,
			<QuestionGradingBox questionId={state.question.id} />
		);
		this.innerComponents.add(gradingBoxRoot);
	}

	protected injectQuestionNavBar(state: QuestionGradingState) {
		const questionHeader = state.sgElements.container.querySelector<HTMLElement>(
			this.selectors.QUESTION_HEADER
		);
		if (!questionHeader) return;

		questionHeader.style.position = 'relative';

		const { reactRoot } = injectReactShadowDOM(
			questionHeader,
			<QuestionNavBar questionId={state.question.id} />
		);
		this.innerComponents.add(reactRoot);
	}

	protected postErrorItem(item: SetOptional<Omit<ISnackbarItem, 'type'>, 'id'>) {
		return postSnackbarItem({ ...item, type: 'error', closeReason: 'manual' });
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
