import type { GradingContext } from '#content/stores/GradingContext';
import type { QuestionGradingState } from '#content/stores/QuestionGradingState';
import type { QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import { sendMessageToBackground } from '#shared/message';
import type { Nullable } from '#shared/types/utils';
import type submitFeedback from './submitFeedback';

type SaveFeedbackResult =
	| { success: false; error: string }
	| { success: true; savedFeedback: Record<IQuestion['id'], Nullable<QuestionFeedback>> };

export default async function saveFeedback(
	context: GradingContext,
	submitResult: Extract<Awaited<ReturnType<typeof submitFeedback>>, { success: true }>
): Promise<SaveFeedbackResult> {
	const savedFeedback: Record<IQuestion['id'], Nullable<QuestionFeedback>> = {};
	if (submitResult.submittedQuestions.size === 0) {
		return { success: true, savedFeedback };
	}
	for (const [questionId, state] of Object.entries(context.gradingStates)) {
		if (!submitResult.submittedQuestions.has(questionId)) continue;

		const newSavedFeedback = getPersistentState(state, questionId);
		savedFeedback[questionId] = newSavedFeedback;
	}
	try {
		await sendMessageToBackground({
			name: 'quizzes.updateFeedback',
			quizId: context.quiz.id,
			submissionId: context.submissionId,
			feedback: savedFeedback,
		});
	} catch (error) {
		return {
			success: false,
			error: `Failed to save question feedback: ${error instanceof Error ? error.message : 'unknown error'}`,
		};
	}
	return { success: true, savedFeedback };
}

function getPersistentState(
	state: QuestionGradingState,
	questionId: IQuestion['id']
): Nullable<QuestionFeedback> {
	const { boxState } = state;
	if (boxState.readOnly) {
		throw new Error('Fatal error: cannot getPersistentState of read-only state');
	}
	if (!boxState.rubricItems || !boxState.selectedRubricItems) {
		return null;
	}
	return {
		questionId,
		gradingMode: boxState.gradingMode,
		rubricItems: boxState.rubricItems.flatMap((item) => {
			if (!boxState.selectedRubricItems[item.id]) {
				return [];
			}
			return item.new ?? item.old;
		}),
		comments: boxState.comments,
	};
}
