import {
	setLastGradedQuestion,
	updateQuestionDirtyState,
} from '#content/stores/gradingContext.actions';
import type {
	DiffRubricItem,
	QuestionGradingBoxState,
	QuestionGradingState,
} from '#content/stores/QuestionGradingState';
import type { IQuestion } from '#models/Question';
import Rubric from '#models/Rubric';
import { isDecimalWithinRange } from '#shared/utils/decimal';
import Decimal from 'decimal.js';
import { isQuestionGradingStateDirty, updateQuestionGradingBoxState } from '.';

export function toggleSelectRubricItem(
	questionId: IQuestion['id'],
	rubricItem: DiffRubricItem
) {
	updateQuestionGradingBoxState(questionId, (state) => {
		const boxState = state?.boxState;
		// Prevent state change in invalid state
		if (!boxState || boxState.readOnly) {
			return;
		}
		// Most-recent version of rubric item
		const item = rubricItem.new ?? rubricItem.old;

		const newBoxState: QuestionGradingBoxState = { ...boxState };
		// Selected rubric items, toggle selection and update state
		const newSelectedRubricItems = { ...boxState.selectedRubricItems };
		let newPoints = Decimal(
			boxState.selectedRubricItems
				? boxState.points
				: Rubric.getInitialPoints(state.question.points, boxState.gradingMode)
		);
		if (newSelectedRubricItems[item.id]) {
			newPoints = newPoints.sub(item.points);
			delete newSelectedRubricItems[item.id];
		} else {
			newPoints = newPoints.add(item.points);
			newSelectedRubricItems[item.id] = true;
		}
		if (Object.keys(newSelectedRubricItems).length > 0) {
			newBoxState.selectedRubricItems = newSelectedRubricItems;
			newBoxState.points = newPoints.toString();
		} else {
			// No rubric items selected, reset to no-feedback state
			newBoxState.selectedRubricItems = null;
			newBoxState.points = null;
		}
		newBoxState.isDirty = isQuestionGradingStateDirty({
			boxState: newBoxState,
			sgState: state.sgState,
		});
		return newBoxState;
	});
	updateQuestionDirtyState(questionId);
	setLastGradedQuestion(questionId);
}

export function checkRubricItemCanToggle(
	state: Pick<QuestionGradingState, 'boxState'>,
	question: Pick<IQuestion, 'points'>,
	rubricItem: DiffRubricItem
) {
	const { boxState } = state;
	if (!boxState || boxState.readOnly) {
		return false;
	}
	// Most-recent version of rubric item
	const item = rubricItem.new ?? rubricItem.old;

	let newPoints = Decimal(
		boxState.points ?? Rubric.getInitialPoints(question.points, boxState.gradingMode)
	);
	if (boxState.selectedRubricItems?.[item.id]) {
		// Rubric item already selected, test subtraction
		newPoints = newPoints.sub(item.points);
	} else {
		// Either rubric item not selected or has manual points override or no feedback
		// Test addition
		newPoints = newPoints.add(item.points);
	}
	return isDecimalWithinRange(newPoints, 0, question.points);
}
