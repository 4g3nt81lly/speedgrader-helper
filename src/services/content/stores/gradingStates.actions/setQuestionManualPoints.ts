import {
	setLastGradedQuestion,
	updateQuestionDirtyState,
} from '#content/stores/gradingContext.actions';
import type { QuestionGradingBoxState } from '#content/stores/QuestionGradingState';
import type { IQuestion } from '#models/Question';
import Decimal from 'decimal.js';
import { isQuestionGradingStateDirty, updateQuestionGradingBoxState } from '.';

export default function setQuestionManualPoints(
	questionId: IQuestion['id'],
	manualPoints: string
) {
	updateQuestionGradingBoxState(questionId, (state) => {
		const boxState = state.boxState;
		if (!boxState || boxState.readOnly) {
			return;
		}
		const newBoxState: QuestionGradingBoxState = {
			...boxState,
			selectedRubricItems: null,
			points: Decimal(manualPoints).toString(),
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
