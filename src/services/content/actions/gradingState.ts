import {
	getFeedbackComments,
	getFullComments,
} from '#content/helpers/getQuestionComments';
import { writeSGState } from '#content/helpers/updateSGInputs';
import type { ContentState } from '#content/stores';
import {
	type DiffRubricItem,
	type QuestionGradingBoxState,
	type QuestionGradingState,
	type SGFeedbackState,
	type SGQuestionDOMElements,
} from '#content/stores/QuestionGradingState';
import type { QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import Rubric, { type IRubric } from '#models/Rubric';
import type { IRubricItem } from '#models/RubricItem';
import type { Nullable, ZustandStore } from '#shared/types/utils';
import StoreActions from '#shared/utils/browser/StoreActions';
import { isDecimal, isDecimalEqual, isDecimalWithinRange } from '#shared/utils/decimal';
import Decimal from 'decimal.js';
import GradingContextActions from './gradingContext';

export default class QuestionGradingStateActions extends StoreActions<ContentState> {
	private readonly questionId: IQuestion['id'];
	private readonly contextActions: GradingContextActions;

	public constructor(store: ZustandStore<ContentState>, questionId: IQuestion['id']) {
		super(store);
		this.questionId = questionId;
		this.contextActions = new GradingContextActions(store);
	}

	private get gradingState() {
		const state = this.state.gradingContext?.gradingStates[this.questionId];
		if (!state) {
			throw new Error('Fatal error: missing question grading state');
		}
		return state;
	}

	update(partial: Partial<QuestionGradingState>) {
		const newState: QuestionGradingState = { ...this.gradingState, ...partial };
		this.contextActions.updateGradingState(this.questionId, newState);
		return newState;
	}

	checkRubricItemCanToggle(rubricItem: DiffRubricItem) {
		const { question, boxState } = this.gradingState;
		if (boxState.readOnly || !boxState.rubricItems) {
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

	toggleSelectRubricItem(rubricItem: DiffRubricItem) {
		const { question, boxState, sgState } = this.gradingState;
		// Prevent state change in invalid state
		if (boxState.readOnly || !boxState.rubricItems) return;

		// Most-recent version of rubric item
		const item = rubricItem.new ?? rubricItem.old;

		const newBoxState: QuestionGradingBoxState = { ...boxState };
		// Selected rubric items, toggle selection and update state
		const newSelectedRubricItems = { ...boxState.selectedRubricItems };
		let newPoints = Decimal(
			boxState.selectedRubricItems
				? boxState.points
				: Rubric.getInitialPoints(question.points, boxState.gradingMode)
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
		newBoxState.isDirty = isDirty({ boxState: newBoxState, sgState });

		const newState = this.update({ boxState: newBoxState })!;
		this.contextActions.setLastGradedQuestion(this.questionId);

		updateSGState(newState);
	}

	setComments(comments: string) {
		const { boxState, sgState } = this.gradingState;
		if (boxState.readOnly || comments === boxState.comments) {
			return;
		}
		const newBoxState: QuestionGradingBoxState = { ...boxState, comments };
		newBoxState.isDirty = isDirty({ boxState: newBoxState, sgState });

		const newState = this.update({ boxState: newBoxState })!;
		this.contextActions.setLastGradedQuestion(this.questionId);

		updateSGState(newState);
	}

	setManualPoints(points: string) {
		const { boxState, sgState } = this.gradingState;
		if (boxState.readOnly) {
			return;
		}
		const newBoxState: QuestionGradingBoxState = {
			...boxState,
			selectedRubricItems: null,
			points: Decimal(points).toString(),
		};
		newBoxState.isDirty = isDirty({ boxState: newBoxState, sgState });

		const newState = this.update({ boxState: newBoxState })!;
		this.contextActions.setLastGradedQuestion(this.questionId);

		updateSGState(newState);
	}

	beginRegrade() {
		const { question, sgState, sgElements } = this.gradingState;
		const emptySGState: SGFeedbackState = { points: '', comments: '' };
		const newBoxState = QuestionGradingStateActions.createBoxState(
			question,
			null,
			emptySGState
		);
		newBoxState.isDirty =
			!newBoxState.readOnly && isDirty({ boxState: newBoxState, sgState });
		this.update({ boxState: newBoxState, isRegrading: true });

		this.contextActions.setLastGradedQuestion(this.questionId);

		writeSGState(sgElements, emptySGState);
	}

	resetBoxState() {
		const { question, savedFeedback, sgState, sgElements } = this.gradingState;
		this.update({
			boxState: QuestionGradingStateActions.createBoxState(
				question,
				savedFeedback,
				sgState
			),
			isRegrading: false,
		});
		this.contextActions.setLastGradedQuestion(this.questionId);

		writeSGState(sgElements, sgState);
	}

	static create(
		question: IQuestion,
		feedback: Nullable<QuestionFeedback>,
		sgElements: SGQuestionDOMElements
	): QuestionGradingState {
		const sgState = createSGFeedbackState(sgElements, question.points);
		return {
			question,
			boxState: this.createBoxState(question, feedback, sgState),
			sgState,
			sgElements,
			savedFeedback: feedback,
			isRegrading: false,
		};
	}

	static createBoxState(
		question: IQuestion,
		feedback: Nullable<QuestionFeedback>,
		sgState: SGFeedbackState
	): QuestionGradingBoxState {
		const rubricItems = getDiffRubricItems(question.rubric, feedback);

		let message: Nullable<string> = sgState.points
			? 'This question has already been graded.'
			: sgState.points === null
				? 'Points awarded in SpeedGrader is not valid.'
				: null;
		const graded = sgState.points !== '';
		if (rubricItems.length === 0) {
			// No rubric, no feedback, nothing
			return {
				rubricItems: null,
				gradingMode: null,
				selectedRubricItems: null,
				comments: '',
				points: null,
				// Read-only iff question is graded
				readOnly: graded,
				isDirty: false,
				stateDiff: { points: false, comments: null },
				message,
			};
		}
		if (!feedback) {
			// Feedback object does not exist, question rubric must be present
			const newState: QuestionGradingBoxState = {
				rubricItems,
				gradingMode: question.rubric!.gradingMode,
				selectedRubricItems: null,
				comments: '',
				points: null,
				// Read-only iff question is graded
				readOnly: graded,
				isDirty: false,
				stateDiff: { points: false, comments: null },
				message,
			};
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
			} else {
				message = null;
			}
		}
		return {
			rubricItems,
			gradingMode: feedback.gradingMode,
			selectedRubricItems,
			points: oldPoints,
			comments,
			readOnly: true,
			isDirty: false,
			stateDiff,
			message,
		};
	}
}

function createSGFeedbackState(
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

function updateSGState(gradingState: QuestionGradingState) {
	const { boxState, sgState, sgElements, isRegrading } = gradingState;
	if (boxState.readOnly) return;

	const defaultPoints = isRegrading ? '' : (sgState.points ?? '');
	const defaultComments = isRegrading ? '' : sgState.comments;

	writeSGState(sgElements, {
		points: boxState.points ?? defaultPoints,
		comments: getFullComments(boxState) || defaultComments,
	});
}

function isDirty(state: Pick<QuestionGradingState, 'boxState' | 'sgState'>) {
	const { boxState, sgState } = state;
	if (boxState.readOnly) {
		return false;
	}
	const points = boxState.points;
	const { points: sgPoints, comments: sgComments } = sgState;
	// Points is unchanged if
	const pointsUnchanged =
		// 1. Points is null (empty) and SG points is empty (ungraded)
		(points === null && sgPoints === '') ||
		// 2. Points and SG points are non-empty and equal
		(points && sgPoints && isDecimalEqual(points, sgPoints));
	if (!pointsUnchanged) {
		return true;
	}
	return getFullComments(boxState) !== sgComments;
}
