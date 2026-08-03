import actions from '#content/actions';
import QuestionGradingStateActions from '#content/actions/gradingState';
import { snackbar } from '#content/actions/snackbar';
import IframeEventProxy from '#content/components/IframeEventProxy';
import { ToplevelEventProxy } from '#content/components/ToplevelEventProxy';
import { injectReactShadowDOM } from '#content/inject';
import { queue } from '#content/main';
import Selectors from '#content/selectors';
import { store } from '#content/stores';
import type { GradingContext } from '#content/stores/GradingContext';
import type { QuestionGradingState } from '#content/stores/QuestionGradingState';
import type { SnackbarItem } from '#content/stores/snackbar';
import QuestionGradingBox from '#content/ui/QuestionGradingBox';
import QuestionNavBar from '#content/ui/QuestionNavBar';
import Snackbar from '#content/ui/Snackbar';
import { sendMessageToBackground } from '#shared/message';
import type { SetOptional } from '#shared/types/utils';
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
	private components = new Set<ReactDOM.Root>();

	public override async inject() {
		try {
			injectReactShadowDOM(document.body, <Snackbar />);
			injectReactShadowDOM(document.body, <ToplevelEventProxy />);

			await this.registerInjectOnLoad();
		} catch (error) {
			this.postErrorItem(
				{ message: error instanceof Error ? error.message : 'An unexpected error has occurred.' },
				reloadPage,
				'Reload page'
			);
			this.cleanup();
		}
	}

	protected async registerInjectOnLoad() {
		const submissionIframeHolder = await getElementByQuerySelector<HTMLElement>(
			this.selectors.SUBMISSION_IFRAME_HOLDER,
			document,
			{ timeoutSeconds: 5 }
		);
		if (!submissionIframeHolder) {
			return this.postErrorItem(
				{ message: 'SpeedGrader not found in reasonable time. Please refresh and try again!' },
				reloadPage,
				'Reload page'
			);
		}
		const handleLoad = (iframe: HTMLIFrameElement) => queue.run(() => this.handleInject(iframe));
		// Start looking for the submission iframe immediately
		const submissionIframe = submissionIframeHolder.querySelector<HTMLIFrameElement>(
			this.selectors.SUBMISSION_IFRAME
		);
		if (submissionIframe?.contentDocument?.readyState === 'complete') {
			// Submission iframe already loaded, execute injection handler right away
			await handleLoad(submissionIframe);
		}
		// Add mutation observer to ensure onload handler is registered
		const mutationObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const addedNode of mutation.addedNodes) {
					if (
						!(addedNode instanceof HTMLIFrameElement) ||
						!addedNode.matches(this.selectors.SUBMISSION_IFRAME)
					) {
						continue;
					}
					console.info('Submission iframe added, registering load handler...');
					const onLoad = () => handleLoad(addedNode);
					addedNode.removeEventListener('load', onLoad);
					addedNode.addEventListener('load', onLoad);
					return;
				}
			}
		});
		mutationObserver.observe(submissionIframeHolder, { childList: true });
	}

	private async handleInject(iframe: HTMLIFrameElement) {
		if (!iframe.isConnected) return;
		console.info('Initializing SpeedGrader Helper...');

		this.cleanup();
		try {
			await this.initializeGradingContext(iframe);

			const gradingContext = store.state.gradingContext;
			if (!gradingContext) return;

			this.registerIframeEventProxy(gradingContext);
			await this.injectGradingComponents(gradingContext);
		} catch (error) {
			this.cleanup();

			// Display error message only if iframe is still attached
			if (!iframe.isConnected) return;
			this.postErrorItem({
				message: `An unexpected error has occurred while initializing SpeedGrader Helper: ${error instanceof Error ? error.message : 'Unknown error'}.`,
			});
		}
		// Clean up right away if iframe is already detached
		if (!iframe.isConnected) {
			this.cleanup();
		}
	}

	private cleanup() {
		// Must unmount all components before resetting global grading context
		this.components.forEach((component) => component.unmount());
		this.components.clear();
		actions.setGradingContext(null);
	}

	protected async initializeGradingContext(iframe: HTMLIFrameElement) {
		const submissionId = new URL(document.URL).searchParams.get('student_id');
		if (submissionId === null) {
			throw new Error(`Failed to extract submission ID from "${document.URL}".`);
		}
		const quiz = await sendMessageToBackground({
			name: 'quizzes.getByURL',
			url: this.canonicalUrl,
		});
		if (!quiz) return;

		const submissionWindow = iframe.contentWindow;
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
			lastGradedQuestionId: null,
			submissionId,
			submissionWindow,
			submissionForm,
			isFeedbackSubmitting: false,
		};
		await Promise.all([
			this.initializeGradingStates(gradingContext),
			this.loadLastGradedQuestionId(gradingContext),
		]);

		actions.setGradingContext(gradingContext);
	}

	protected async initializeGradingStates(partialContext: GradingContext) {
		const { quiz, submissionId, submissionWindow } = partialContext;
		const submissionFeedback = await sendMessageToBackground({
			name: 'quizzes.getFeedback',
			quizId: quiz.id,
			submissionId,
		}).catch((error) => {
			snackbar.post({
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

			partialContext.gradingStates[question.id] = QuestionGradingStateActions.create(
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

	private async loadLastGradedQuestionId(context: GradingContext) {
		const quiz = context.quiz;
		try {
			context.lastGradedQuestionId = await sendMessageToBackground({
				name: 'quizzes.getLastGradedQuestion',
				quizId: quiz.id,
			});
		} catch (error) {
			snackbar.post({
				message: `Unable to load last-graded question: ${error instanceof Error ? error.message : 'Unknown error'}.`,
				type: 'warning',
			});
		}
	}

	protected registerIframeEventProxy(context: GradingContext) {
		if (!context.quiz.isEnabled) return;

		const { reactRoot } = injectReactShadowDOM(
			context.submissionWindow.document.body,
			<IframeEventProxy />
		);
		this.components.add(reactRoot);
	}

	protected async injectGradingComponents(context: GradingContext) {
		if (!context.quiz?.isEnabled) return;

		for (const [questionId, gradingState] of Object.entries(context.gradingStates)) {
			this.injectQuestionNavBar(gradingState);

			const { reactRoot: gradingBoxRoot } = injectReactShadowDOM(
				gradingState.sgElements.text,
				<QuestionGradingBox questionId={questionId} />
			);
			this.components.add(gradingBoxRoot);
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
		this.components.add(reactRoot);
	}

	protected postErrorItem(
		item: SetOptional<Omit<SnackbarItem, 'type' | 'retry'>, 'id'>,
		retry?: () => void,
		retryTooltip?: string
	) {
		return snackbar.post({
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
