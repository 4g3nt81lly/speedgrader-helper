import { InnerEventProxy, ToplevelEventProxy } from '#content/EventProxy';
import { injectReactShadowDOM } from '#content/inject';
import Selectors from '#content/selectors';
import type { QuestionGradingState } from '#content/stores/QuestionGradingState';
import { updateGradingContext } from '#content/stores/gradingContext.actions';
import { createQuestionGradingState } from '#content/stores/gradingStates.actions';
import { useContentStore, type GradingContext } from '#content/stores/main.store';
import { postSnackbarItem, type SnackbarItem } from '#content/stores/snackbar.store';
import QuestionGradingBox from '#content/ui/QuestionGradingBox';
import QuestionNavBar from '#content/ui/QuestionNavBar';
import Snackbar from '#content/ui/snackbar/Snackbar';
import Constants from '#shared/constants';
import QuizFeedbackLocalStore from '#shared/stores/QuizFeedbackLocalStore';
import QuizLocalStore from '#shared/stores/QuizLocalStore';
import type { Nullable, SetOptional } from '#shared/types/utils';
import { getElementByQuerySelector, reloadPage } from '#shared/utils/browser/index';
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
	private toplevelComponents = new Set<ReactDOM.Root>();
	private innerComponents = new Set<ReactDOM.Root>();

	public override async inject() {
		try {
			injectReactShadowDOM(document.body, <Snackbar />);

			await this.registerInjectOnLoad();
		} catch (error) {
			this.postErrorItem(
				{ message: error instanceof Error ? error.message : 'An unexpected error has occurred.' },
				reloadPage,
				'Reload page'
			);
			this.cleanup(true);
		}
	}

	protected async registerInjectOnLoad() {
		const submissionIframeHolder = await getElementByQuerySelector<HTMLElement>(
			this.selectors.SUBMISSION_IFRAME_HOLDER,
			document,
			{ timeout: 5 * Constants.SECOND_MS }
		);
		if (!submissionIframeHolder) {
			return this.postErrorItem(
				{ message: 'SpeedGrader not found in reasonable time. Please try again!' },
				this.registerInjectOnLoad.bind(this)
			);
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
		console.info('Initializing SpeedGrader Helper...');
		this.cleanup();
		try {
			await this.initializeGradingContext();

			const gradingContext = useContentStore.getState().gradingContext;
			if (!gradingContext) return;

			this.registerEventProxies(gradingContext);
			await this.injectGradingComponents(gradingContext);
		} catch (error) {
			this.postErrorItem(
				{
					message: `An unexpected error has occurred while initializing SpeedGrader Helper: ${error instanceof Error ? error.message : 'Unknown error'}.`,
				},
				this.handleInject.bind(this)
			);
			this.cleanup(true);
		}
	}

	private cleanup(toplevel: boolean = false) {
		// Must unmount all components before resetting global grading context
		this.innerComponents.forEach((component) => component.unmount());
		this.innerComponents.clear();
		if (toplevel) {
			this.toplevelComponents.forEach((component) => component.unmount());
			this.toplevelComponents.clear();
		}
		useContentStore.setState({ gradingContext: null });
	}

	protected async initializeGradingContext() {
		const submissionId = new URL(document.URL).searchParams.get('student_id');
		if (submissionId === null) {
			throw new Error(`Failed to extract submission ID from "${document.URL}".`);
		}
		const quiz = await QuizLocalStore.getQuizByUrl(this.canonicalUrl);
		if (!quiz) return;

		const submissionWindow = this.submissionIframe!.contentWindow;
		if (!submissionWindow) {
			throw new Error('SpeedGrader submission window not found.');
		}
		const submissionForm = submissionWindow.document.querySelector<HTMLFormElement>(
			this.selectors.SUBMISSION_FORM
		);
		if (!submissionForm) {
			throw new Error('SpeedGrader submission form not found.');
		}

		const gradingContext: GradingContext = {
			quiz,
			gradingStates: {},
			dirtyQuestions: new Set(),
			lastGradedQuestionId: null,
			submissionId,
			submissionWindow,
			submissionForm,
			isFeedbackSubmitting: false,
		};
		await this.initializeGradingStates(gradingContext);

		useContentStore.setState({ gradingContext });

		await this.loadLastGradedQuestionId(gradingContext);
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
			const commentsTextarea = questionContainer.querySelector<HTMLTextAreaElement>(
				this.selectors.QUESTION_COMMENTS_TEXTAREA
			);
			if (!textElement || !pointsInput || !commentsTextarea) continue;

			partialGradingContext.gradingStates[question.id] = createQuestionGradingState(
				question,
				submissionFeedback?.questions[question.id] ?? null,
				{
					container: questionContainer,
					text: textElement,
					pointsInput,
					commentsTextarea,
				}
			);
		}
	}

	private async loadLastGradedQuestionId(gradingContext: GradingContext) {
		const quiz = gradingContext.quiz;
		try {
			updateGradingContext({
				lastGradedQuestionId: await QuizLocalStore.getQuizLastGradedQuestionId(quiz.id),
			});
		} catch (error) {
			postSnackbarItem({
				message: `Unable to load last-graded question: ${error instanceof Error ? error.message : 'Unknown error'}.`,
				type: 'warning',
				retry: { handler: this.loadLastGradedQuestionId.bind(this, gradingContext) },
			});
		}
	}

	protected registerEventProxies(gradingContext: GradingContext) {
		if (!gradingContext.quiz?.isEnabled) return;

		if (!this.toplevelEventProxyIsLoaded) {
			const { reactRoot: toplevelEventProxyRoot } = injectReactShadowDOM(
				document.body,
				<ToplevelEventProxy />
			);
			this.toplevelEventProxyIsLoaded = true;
			this.toplevelComponents.add(toplevelEventProxyRoot);
		}
		const { reactRoot: innerEventProxyRoot } = injectReactShadowDOM(
			gradingContext.submissionWindow.document.body,
			<InnerEventProxy />
		);
		this.innerComponents.add(innerEventProxyRoot);
	}

	protected async injectGradingComponents(gradingContext: GradingContext) {
		if (!gradingContext.quiz?.isEnabled) return;

		for (const [questionId, gradingState] of Object.entries(gradingContext.gradingStates)) {
			this.injectQuestionNavBar(gradingState);

			const { reactRoot: gradingBoxRoot } = injectReactShadowDOM(
				gradingState.sgElements.text,
				<QuestionGradingBox questionId={questionId} />
			);
			this.innerComponents.add(gradingBoxRoot);
		}
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

	protected postErrorItem(
		item: SetOptional<Omit<SnackbarItem, 'type' | 'retry'>, 'id'>,
		retry?: () => void,
		retryTooltip?: string
	) {
		return postSnackbarItem({
			...item,
			type: 'error',
			retry: retry ? { handler: retry, tooltip: retryTooltip } : undefined,
		});
	}

	protected override get selectors() {
		return Selectors.oldSG;
	}
}

export class NewSGQuizInjector extends OldSGQuizInjector {
	protected override get selectors() {
		return Selectors.newSG;
	}
}
