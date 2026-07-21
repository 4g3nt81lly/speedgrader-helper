import { updateGradingContext } from '#content/stores/gradingContext.actions';
import { createQuestionGradingBoxState } from '#content/stores/gradingStates.actions';
import { getFullComments } from '#content/stores/gradingStates.actions/getQuestionComments';
import { useContentStore } from '#content/stores/main.store';
import type {
	QuestionGradingState,
	SGFeedbackState,
} from '#content/stores/QuestionGradingState';
import { postSnackbarItem } from '#content/stores/snackbar.store';
import type { QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import { sendMessageToBackground } from '#shared/message';
import { BackgroundCommand } from '#shared/types/message';
import type { Nullable } from '#shared/types/utils';

export default async function saveFeedback(questionIds: Iterable<string>) {
	const gradingContext = useContentStore.getState().gradingContext;
	if (!gradingContext) return;
	const { quiz, submissionId } = gradingContext;

	const states = gradingContext.gradingStates;
	if (!states) return;

	const newStatePromises = [...questionIds].map<
		Promise<[IQuestion['id'], QuestionGradingState]>
	>(async (questionId) => {
		const state = states[questionId]!;
		const newSavedFeedback = getPersistentState(state, questionId);
		await sendMessageToBackground({
			command: BackgroundCommand.updateQuestionFeedbackInStore,
			quizId: quiz.id,
			submissionId,
			question: {
				...(newSavedFeedback ? { feedback: newSavedFeedback } : { id: questionId }),
			},
		});
		const newSGState = getSGState(state);
		return [
			questionId,
			{
				...state,
				boxState: createQuestionGradingBoxState(
					state.question,
					newSavedFeedback,
					newSGState
				),
				sgState: newSGState,
				savedFeedback: newSavedFeedback,
				isRegrading: false,
			},
		];
	});

	const newStateResults = await Promise.allSettled(newStatePromises);
	const newStateEntries = newStateResults.flatMap((result) => {
		if (result.status === 'rejected') {
			const error = result.reason;
			console.error(
				'Failed to save question feedback:',
				error instanceof Error ? error.message : 'Unknown error'
			);
			postSnackbarItem({
				title: 'Error: Save',
				message: 'Unable to save submitted feedback.',
				type: 'warning',
				closeReason: 'manual',
			});
			return [];
		}
		return [result.value];
	});
	updateGradingContext({
		gradingStates: { ...states, ...Object.fromEntries(newStateEntries) },
	});
}

function getSGState(state: QuestionGradingState): SGFeedbackState {
	const boxState = state.boxState;
	if (!boxState) {
		return state.sgState;
	}
	return {
		points: boxState.points ?? '',
		comments: getFullComments(boxState),
	};
}

function getPersistentState(
	state: QuestionGradingState,
	questionId: IQuestion['id']
): Nullable<QuestionFeedback> {
	const boxState = state.boxState;
	if (!boxState) return null;

	if (boxState.readOnly) {
		throw new Error('getPersistentGradingState: read-only state');
	}
	if (boxState.selectedRubricItems === null) {
		return null;
	}
	return {
		questionId,
		gradingMode: boxState.gradingMode,
		rubricItems: boxState.rubricItems.flatMap((rubricItem) => {
			if (!boxState.selectedRubricItems[rubricItem.id]) {
				return [];
			}
			return rubricItem.new ?? rubricItem.old;
		}),
		comments: boxState.comments,
	};
}
