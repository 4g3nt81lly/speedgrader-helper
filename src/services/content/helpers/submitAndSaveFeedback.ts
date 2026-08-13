import type GradingContextActions from '#content/actions/gradingContext';
import QuestionGradingStateActions from '#content/actions/gradingState';
import { snackbar } from '#content/actions/snackbar';
import { ContentEvent, dispatchContentEvent } from '#content/event';
import type { GradingContext } from '#content/stores/GradingContext';
import type { SGFeedbackState } from '#content/stores/QuestionGradingState';
import type { QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import type { Nullable } from '#shared/types/utils';
import { getFullComments } from './getQuestionComments';
import saveFeedback from './saveFeedback';
import submitFeedback from './submitFeedback';
import { writeSGState } from './updateSGInputs';

export type SubmitAndSaveFeedbackResult =
	// A submission is already in in progress.
	| { status: 'busy' }
	// Nothing to submit and save.
	| { status: 'noop' }
	// Failed to submit and save.
	| {
			status: 'failed';
			error: string;
	  }
	// Successfully submitted but failed to save.
	| {
			status: 'submitted';
			submittedQuestions: Set<IQuestion['id']>;
			saveError: string;
	  }
	// Successfully submitted and saved.
	| {
			status: 'success';
			submittedQuestions: Set<IQuestion['id']>;
			savedFeedback: Record<IQuestion['id'], Nullable<QuestionFeedback>>;
	  };

export type SubmitAndSaveFeedbackOptions = {
	verboseNoOp?: boolean;
};

export default async function submitAndSaveFeedback(
	this: GradingContextActions,
	options: SubmitAndSaveFeedbackOptions
): Promise<Exclude<SubmitAndSaveFeedbackResult, { status: 'busy' }>> {
	const submitResult = await submitFeedback(
		this.gradingContext,
		this.state.appSettings.feedbackSubmissionStrategy
	);
	if (!submitResult.success) {
		snackbar.post({
			message: `Unable to submit feedback: ${submitResult.error}. Please try again!`,
			type: 'error',
		});
		return { status: 'failed', error: submitResult.error };
	}
	if (submitResult.submittedQuestions.size === 0) {
		if (options.verboseNoOp) {
			snackbar.post({
				title: 'Good to go!',
				message: 'Nothing to submit and save!',
				type: 'success',
				timeoutSeconds: 2,
			});
		}
		return { status: 'noop' };
	}
	snackbar.post({
		message: 'Successfully submitted feedback!',
		type: 'success',
		timeoutSeconds: 2,
	});
	// Refresh grades and update stats in SpeedGrader header
	dispatchContentEvent(ContentEvent.refreshGrades, {}, window);

	const saveResult = await saveFeedback(this.gradingContext, submitResult);
	if (saveResult.success) {
		commitSavedFeedback.call(this, saveResult);
	} else {
		snackbar.post({
			title: 'Error: Save feedback',
			message: saveResult.error,
			type: 'warning',
		});
	}
	// Suppress SpeedGrader's weird default behaviour (which caches unsaved feedback)
	// by restoring inputs to last submitted
	syncSGFeedback(this.gradingContext);

	if (!saveResult.success) {
		return {
			status: 'submitted',
			submittedQuestions: submitResult.submittedQuestions,
			saveError: saveResult.error,
		};
	}
	return {
		status: 'success',
		submittedQuestions: submitResult.submittedQuestions,
		savedFeedback: saveResult.savedFeedback,
	};
}

function commitSavedFeedback(
	this: GradingContextActions,
	saveResult: Extract<Awaited<ReturnType<typeof saveFeedback>>, { success: true }>
) {
	const gradingStates = this.gradingContext.gradingStates;
	const partialGradingStates: GradingContext['gradingStates'] = {};
	for (const [questionId, savedFeedback] of Object.entries(saveResult.savedFeedback)) {
		const state = gradingStates[questionId];
		if (!state) continue;

		const newSGState: SGFeedbackState = {
			points: state.boxState.points ?? '',
			comments: getFullComments(state.boxState),
		};
		partialGradingStates[questionId] = {
			...state,
			boxState: QuestionGradingStateActions.createBoxState(
				state.question,
				savedFeedback,
				newSGState
			),
			sgState: newSGState,
			savedFeedback,
			isRegrading: false,
		};
	}
	this.updateGradingStates(partialGradingStates);
}

function syncSGFeedback(gradingContext: GradingContext) {
	for (const { sgState, sgElements } of Object.values(gradingContext.gradingStates)) {
		writeSGState(sgElements, sgState);
	}
}
