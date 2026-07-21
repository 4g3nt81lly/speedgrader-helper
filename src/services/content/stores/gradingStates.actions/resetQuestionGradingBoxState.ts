import {
	setLastGradedQuestion,
	updateQuestionDirtyState,
} from '#content/stores/gradingContext.actions';
import type { IQuestion } from '#models/Question';
import { createQuestionGradingBoxState, updateQuestionGradingState } from '.';

export default function resetQuestionGradingBoxState(questionId: IQuestion['id']) {
	updateQuestionGradingState(questionId, (state) => ({
		boxState: createQuestionGradingBoxState(
			state.question,
			state.savedFeedback,
			state.sgState
		),
		isRegrading: false,
	}));
	updateQuestionDirtyState(questionId);
	setLastGradedQuestion(questionId);
}
