import navigateSubmission, {
	type NavigateSubmissionDirection,
} from '#content/helpers/navigateSubmission';
import reloadQuiz from '#content/helpers/reloadQuiz';
import submitAndSaveFeedback from '#content/helpers/submitAndSaveFeedback';
import { queue } from '#content/main';
import type { ContentState } from '#content/stores';
import type { GradingContext } from '#content/stores/GradingContext';
import type { QuestionGradingState } from '#content/stores/QuestionGradingState';
import type { IQuestion } from '#models/Question';
import type { Nullable, Optional } from '#shared/types/utils';
import StoreActions from '#shared/utils/browser/StoreActions';
import { snackbar } from './snackbar';

export default class GradingContextActions extends StoreActions<ContentState> {
	protected get gradingContext() {
		const gradingContext = this.state.gradingContext;
		if (!gradingContext) {
			throw new Error('Fatal error: missing grading context');
		}
		return gradingContext;
	}

	protected update(
		state:
			| Partial<GradingContext>
			| ((gradingContext: GradingContext) => Optional<Partial<GradingContext>>)
	) {
		const gradingContext = this.gradingContext;

		const partial = typeof state === 'function' ? state(gradingContext) : state;
		if (!partial) return;

		this.store.setState((state) => ({
			...state,
			gradingContext: { ...gradingContext, ...partial },
		}));
	}

	protected updateGradingStates(partial: GradingContext['gradingStates']) {
		this.update((gradingContext) => ({
			gradingStates: {
				...gradingContext.gradingStates,
				...partial,
			},
		}));
	}

	updateGradingState(questionId: IQuestion['id'], gradingState: QuestionGradingState) {
		this.updateGradingStates({ [questionId]: gradingState });
	}

	setLastGradedQuestion(questionId: Nullable<IQuestion['id']>) {
		this.update({ lastGradedQuestionId: questionId });
	}

	reloadQuiz() {
		return queue.run(reloadQuiz.bind(this));
	}

	async submitAndSaveFeedback(
		options: Parameters<typeof submitAndSaveFeedback>[0] = {}
	): ReturnType<typeof submitAndSaveFeedback> {
		if (this.gradingContext.isFeedbackSubmitting) {
			snackbar.post({
				title: 'Submit and save',
				message: 'Feedback submission in progress...',
				type: 'warning',
				timeoutSeconds: 2,
			});
			return { status: 'busy' };
		}
		return queue.run(submitAndSaveFeedback.bind(this, options));
	}

	async submitFeedbackAndNavigate(direction: NavigateSubmissionDirection) {
		console.info('Submit-n-navigate initiated');
		const result = await this.submitAndSaveFeedback();
		console.info('Submitted and saved, now navigating');
		if (result.status === 'success' || result.status === 'noop') {
			await this.navigateSubmission(direction);
			console.info('Done navigating');
		}
	}

	async navigateSubmission(direction: NavigateSubmissionDirection) {
		if (this.state.gradingContext?.isFeedbackSubmitting) {
			snackbar.post({
				message: "Feedback submission in progress, please wait until it's complete!",
				type: 'warning',
			});
			return false;
		}
		return queue.run(navigateSubmission.bind(this, direction));
	}
}
