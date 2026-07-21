import { updateGradingContext } from '#content/stores/gradingContext.actions';
import { useContentStore } from '#content/stores/main.store';
import type {
	DiffRubricItem,
	QuestionGradingBoxState,
	QuestionGradingState,
	SGFeedbackState,
	SGQuestionDOMElements,
} from '#content/stores/QuestionGradingState';
import type { QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import type { IRubric } from '#models/Rubric';
import Rubric from '#models/Rubric';
import type { IRubricItem } from '#models/RubricItem';
import type { Nullable, Optional } from '#shared/types/utils';
import { isDecimal, isDecimalEqual, isDecimalWithinRange } from '#shared/utils/decimal';
import Decimal from 'decimal.js';
import { getFeedbackComments, getFullComments } from './getQuestionComments';
import beginRegradeQuestion from './regradeQuestion';
import resetQuestionGradingBoxState from './resetQuestionGradingBoxState';
import { checkRubricItemCanToggle, toggleSelectRubricItem } from './selectRubricItem';
import setQuestionComments from './setQuestionComments';
import setQuestionManualPoints from './setQuestionManualPoints';

const gradingStateActions = {
	checkRubricItemCanToggle,
	toggleSelectRubricItem,
	setQuestionComments,
	setQuestionManualPoints,
	beginRegradeQuestion,
	resetQuestionGradingBoxState,
	getQuestionComments: getFullComments,
};

export default gradingStateActions;

export function getGradingStates() {
	return useContentStore.getState().gradingContext?.gradingStates ?? null;
}

export function getQuestionGradingState(questionId: IQuestion['id']) {
	return getGradingStates()?.[questionId] ?? null;
}

export function updateQuestionGradingState(
	questionId: IQuestion['id'],
	newState:
		| Partial<QuestionGradingState>
		| ((state: QuestionGradingState) => Nullable<Partial<QuestionGradingState>>)
) {
	const gradingStates = getGradingStates();
	const state = gradingStates?.[questionId];
	if (!state) return;

	if (typeof newState === 'function') {
		const newStateValue = newState(state);
		if (!newStateValue) return;
		newState = newStateValue;
	}
	updateGradingContext({
		gradingStates: { ...gradingStates, [questionId]: { ...state, ...newState } },
	});
}

export function updateQuestionGradingBoxState(
	questionId: IQuestion['id'],
	newBoxState:
		| Nullable<QuestionGradingBoxState>
		| ((state: QuestionGradingState) => Optional<Nullable<QuestionGradingBoxState>>)
) {
	updateQuestionGradingState(questionId, (state) => {
		if (typeof newBoxState === 'function') {
			const newBoxStateValue = newBoxState(state);
			if (newBoxStateValue === undefined) {
				return null;
			}
			newBoxState = newBoxStateValue;
		}
		return { boxState: newBoxState };
	});
}

export function createQuestionGradingState(
	question: IQuestion,
	feedback: Nullable<QuestionFeedback>,
	sgElements: SGQuestionDOMElements
): QuestionGradingState {
	const sgState = createSGFeedbackState(sgElements, question.points);
	return {
		question,
		boxState: createQuestionGradingBoxState(question, feedback, sgState),
		sgState,
		sgElements,
		savedFeedback: feedback,
		isRegrading: false,
	};
}

export function createQuestionGradingBoxState(
	question: IQuestion,
	feedback: Nullable<QuestionFeedback>,
	sgState: SGFeedbackState
): Nullable<QuestionGradingBoxState> {
	const rubricItems = getDiffRubricItems(question.rubric, feedback);
	if (rubricItems.length === 0) {
		// No rubric, no feedback, nothing
		return null;
	}
	if (!feedback) {
		// Feedback object does not exist, question rubric must be present
		// Read-only iff question is graded
		const message = sgState.points
			? 'This question has already been graded.'
			: sgState.points === null
				? 'Points awarded in SpeedGrader is not valid.'
				: null;
		const newState: QuestionGradingBoxState = {
			gradingMode: question.rubric!.gradingMode,
			rubricItems,
			selectedRubricItems: null,
			comments: '',
			points: null,
			readOnly: sgState.points !== '',
			isDirty: false,
			stateDiff: { points: false, comments: null },
			message,
		};
		newState.isDirty =
			!newState.readOnly && isQuestionGradingStateDirty({ boxState: newState, sgState });
		return newState;
	}
	// Feedback object exists, read-only
	const comments = feedback.comments;
	const selectedRubricItems: QuestionGradingBoxState['selectedRubricItems'] = {};
	// Calculate original points using feedback object
	let feedbackPoints = Decimal(
		Rubric.getInitialPoints(question.points, feedback.gradingMode)
	);
	// Calculate current points using current rubric object, if any
	let rubricPoints: Nullable<Decimal> = null;
	if (question.rubric) {
		rubricPoints = Decimal(
			Rubric.getInitialPoints(question.points, question.rubric.gradingMode)
		);
	}
	for (const selectedRubricItem of feedback.rubricItems ?? []) {
		selectedRubricItems[selectedRubricItem.id] = true;
		feedbackPoints = feedbackPoints.add(selectedRubricItem.points);

		if (rubricPoints === null) continue;
		const currentItem = question.rubric!.items.find(
			(item) => item.id === selectedRubricItem.id
		);
		// Selected rubric item was removed, ignore as if it was not selected
		if (!currentItem) continue;
		rubricPoints = rubricPoints.add(currentItem.points);
	}
	const oldPoints = feedbackPoints.toString();
	const oldComments = getFeedbackComments(feedback);
	const stateDiff = {
		points: !sgState.points || !isDecimalEqual(oldPoints, sgState.points),
		comments: sgState.comments === oldComments ? null : oldComments,
	};

	let message: Nullable<string> = null;
	if (rubricPoints === null) {
		// Rubric was removed since last graded
		message = 'The rubric has been removed since last graded. Please review.';
	} else if (isDecimalEqual(feedbackPoints, rubricPoints)) {
		// Question rubric still exists
		// Same points but may or may not have been modified
		message = rubricItems.some(
			({ status }) => status === 'modified' || status === 'removed'
		)
			? 'The rubric has been updated since last graded.'
			: null;
	} else {
		// New question rubric yields different points than before
		const newPoints = rubricPoints.toString();
		const newPointsIsValid = isDecimalWithinRange(rubricPoints, 0, question.points);
		// If points already diverged, do not show the message to avoid overwhelming the user
		if (!stateDiff.points) {
			message = `The rubric has been updated since last graded: old rubric awarded "${oldPoints}" points but new rubric awards "${newPoints}" points${newPointsIsValid ? '' : ' (which is invalid)'}. Please consider regrading this question.`;
		}
	}
	return {
		gradingMode: feedback.gradingMode,
		rubricItems,
		selectedRubricItems,
		points: oldPoints,
		comments,
		readOnly: true,
		isDirty: false,
		stateDiff,
		message,
	};
}

export function createSGFeedbackState(
	sgElements: SGQuestionDOMElements,
	maxPoints: IQuestion['points']
): SGFeedbackState {
	let sgPoints: Nullable<string> = sgElements.pointsInput.value.trim();
	if (
		sgPoints &&
		(!isDecimal(sgPoints) || !isDecimalWithinRange(sgPoints, 0, maxPoints))
	) {
		sgPoints = null;
	}
	return { points: sgPoints, comments: sgElements.commentsTextarea.textContent! };
}

export function isQuestionGradingStateDirty(
	state: Pick<QuestionGradingState, 'boxState' | 'sgState'>
) {
	const { boxState, sgState } = state;
	if (!boxState || boxState.readOnly) {
		return false;
	}
	const points = boxState.points;
	const { points: sgPoints, comments: sgComments } = sgState;
	// Points is unchanged if
	// 1. Points is null (empty)
	// 2. Points and SG points are non-empty and equal
	const pointsUnchanged =
		points === null || (sgPoints && isDecimalEqual(points, sgPoints));
	if (!pointsUnchanged) {
		return true;
	}
	return getFullComments(boxState) !== sgComments;
}

function getDiffRubricItems(
	rubric: Nullable<Pick<IRubric, 'items'>>,
	feedback: Nullable<QuestionFeedback>
): DiffRubricItem[] {
	const diffItems: DiffRubricItem[] = [];

	// Add selected rubric items first
	const selectedRubricItemIds = new Set<IRubricItem['id']>();
	for (const selectedRubricItem of feedback?.rubricItems ?? []) {
		const rubricItem = rubric?.items.find((item) => item.id === selectedRubricItem.id);
		if (rubricItem) {
			// Selected rubric item still exists, either no change or modified
			const isModified =
				rubricItem.description !== selectedRubricItem.description ||
				rubricItem.points !== selectedRubricItem.points;
			diffItems.push({
				id: rubricItem.id,
				status: isModified ? 'modified' : 'unchanged',
				new: rubricItem,
				old: selectedRubricItem,
			});
			selectedRubricItemIds.add(rubricItem.id);
		} else {
			// Selected rubric item was removed
			diffItems.push({
				id: selectedRubricItem.id,
				status: 'removed',
				new: null,
				old: selectedRubricItem,
			});
		}
	}
	// Add new (added and unselected) rubric items
	for (const newRubricItem of rubric?.items ?? []) {
		if (selectedRubricItemIds.has(newRubricItem.id)) continue;
		diffItems.push({
			id: newRubricItem.id,
			status: 'new',
			new: newRubricItem,
			old: null,
		});
	}
	return diffItems;
}
