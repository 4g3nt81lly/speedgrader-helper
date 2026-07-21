import {
	setLastGradedQuestion,
	updateQuestionDirtyState,
} from '#content/stores/gradingContext.actions';
import type { QuestionGradingBoxState } from '#content/stores/QuestionGradingState';
import type { IQuestion } from '#models/Question';
import { isQuestionGradingStateDirty, updateQuestionGradingBoxState } from '.';

export default function setQuestionComments(
	questionId: IQuestion['id'],
	newComments: string
) {
	updateQuestionGradingBoxState(questionId, (state) => {
		const boxState = state.boxState;
		if (!boxState || boxState.readOnly || newComments === boxState.comments) {
			return;
		}
		const newBoxState: QuestionGradingBoxState = {
			...boxState,
			comments: newComments,
		};
		newBoxState.isDirty = isQuestionGradingStateDirty({
			boxState: newBoxState,
			sgState: state.sgState,
		});
		return newBoxState;
	});
	updateQuestionDirtyState(questionId);
	setLastGradedQuestion(questionId);
}
