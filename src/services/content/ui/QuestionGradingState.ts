import Decimal from 'decimal.js';
import type { QuestionFeedback } from '~/models/Feedback';
import type { IQuestion } from '~/models/Question';
import type { GradingMode } from '~/models/Rubric';
import type { IRubricItem } from '~/models/RubricItem';
import { isDecimalEqual, isDecimalPositive, isDecimalWithinRange } from '~/shared/utils';
import type { Nullable } from '~/types/utils';

const enum QuestionFeedbackMode {
	Manual = 2,
	Rubric = 3,
}

export type IQuestionGradingState = {
	rubricItems: DiffRubricItem[];
	isDirty: boolean;
	invalidError: Nullable<string>;
} & (
	| {
			mode: QuestionFeedbackMode.Manual;
			gradingMode: Nullable<QuestionFeedback['gradingMode']>;
			points: null;
			selectedRubricItems: null;
			manualPoints: Nullable<string>;
			comments: string;
	  }
	| {
			mode: QuestionFeedbackMode.Rubric;
			gradingMode: NonNullable<QuestionFeedback['gradingMode']>;
			points: string;
			selectedRubricItems: Record<IRubricItem['id'], true>;
			manualPoints: null;
			comments: string;
	  }
);

export const enum RubricItemDiffStatus {
	noChange = 0,
	new = 1,
	modified = 2,
	removed = 3,
}

export type DiffRubricItem = { id: IRubricItem['id'] } & (
	| {
			status: RubricItemDiffStatus.noChange;
			new: IRubricItem;
			old: IRubricItem;
	  }
	| {
			status: RubricItemDiffStatus.new;
			new: IRubricItem;
			old: null;
	  }
	| {
			status: RubricItemDiffStatus.modified;
			new: IRubricItem;
			old: IRubricItem;
	  }
	| {
			status: RubricItemDiffStatus.removed;
			new: null;
			old: IRubricItem;
	  }
);

export class QuestionGradingState {
	public static create(
		question: IQuestion,
		feedback: Nullable<QuestionFeedback>,
		pointsInput: HTMLInputElement,
		commentsTextarea: HTMLTextAreaElement
	): IQuestionGradingState {
		const rubricItems = this.generateDiffRubricItems(question.rubric, feedback);
		if (!feedback) {
			// No saved feedback but question might already be graded
			const manualPoints = pointsInput.value.trim();
			return {
				mode: QuestionFeedbackMode.Manual,
				gradingMode: question.rubric?.gradingMode ?? null,
				points: null,
				selectedRubricItems: null,
				manualPoints:
					manualPoints && isFinite(Number(manualPoints)) ? manualPoints : null,
				comments: commentsTextarea.textContent.trim(),
				rubricItems,
				isDirty: false,
				invalidError: null,
			};
		}
		let invalidError: Nullable<string> = null;

		const gradingMode = question.rubric?.gradingMode ?? feedback.gradingMode;
		if (feedback.manualPoints !== null) {
			// Feedback contains manual points override
			if (!isDecimalWithinRange(feedback.manualPoints, 0, question.points)) {
				invalidError = `Saved manual points not within valid range [0, ${question.points}]`;
			}
			return {
				mode: QuestionFeedbackMode.Manual,
				gradingMode,
				points: null,
				selectedRubricItems: null,
				manualPoints: feedback.manualPoints,
				comments: feedback.comments,
				rubricItems,
				isDirty: false,
				invalidError,
			};
		}
		if (feedback.rubricItems === null) {
			// Feedback contains comments only
			return {
				mode: QuestionFeedbackMode.Manual,
				gradingMode,
				points: null,
				selectedRubricItems: null,
				manualPoints: null,
				comments: feedback.comments,
				rubricItems,
				isDirty: false,
				invalidError,
			};
		}
		// Rubric items were selected, calculate total points using feedback grading mode
		let points = Decimal(this.getInitialPoints(question.points, feedback.gradingMode));
		const selectedRubricItems: Record<IRubricItem['id'], true> = {};
		for (const selectedRubricItem of feedback.rubricItems) {
			// If a rubric item was modified, use the new points from question.rubric, if exists
			// Otherwise, use the old points
			const itemPoints =
				question.rubric?.items.find(
					(rubricItem) => rubricItem.id === selectedRubricItem.id
				)?.points ?? selectedRubricItem.points;
			points = points.add(itemPoints);
			selectedRubricItems[selectedRubricItem.id] = true;
		}
		if (!isDecimalWithinRange(points, 0, question.points)) {
			invalidError = `New points not within valid range [0, ${question.points}]`;
		}
		return {
			mode: QuestionFeedbackMode.Rubric,
			// Rubric item interactions will prefer new rubric grading mode
			gradingMode: feedback.gradingMode,
			points: points.toString(),
			selectedRubricItems,
			manualPoints: null,
			comments: feedback.comments,
			rubricItems,
			isDirty: false,
			invalidError,
		};
	}

	public static generateDiffRubricItems(
		rubric: IQuestion['rubric'],
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
					status: isModified
						? RubricItemDiffStatus.modified
						: RubricItemDiffStatus.noChange,
					new: rubricItem,
					old: selectedRubricItem,
				});
				selectedRubricItemIds.add(rubricItem.id);
			} else {
				// Selected rubric item was removed
				diffItems.push({
					id: selectedRubricItem.id,
					status: RubricItemDiffStatus.removed,
					new: null,
					old: selectedRubricItem,
				});
			}
		}
		if (!rubric?.items) {
			return diffItems;
		}
		// Add new (added and unselected) rubric items
		for (const newRubricItem of rubric.items) {
			if (selectedRubricItemIds.has(newRubricItem.id)) continue;
			diffItems.push({
				id: newRubricItem.id,
				status: RubricItemDiffStatus.new,
				new: newRubricItem,
				old: null,
			});
		}
		return diffItems;
	}

	public static getInitialPoints(
		maxPoints: IQuestion['points'],
		gradingMode: GradingMode
	) {
		return gradingMode === 'negative' ? maxPoints : '0';
	}

	public static isDirty(
		state: IQuestionGradingState,
		defaultState: IQuestionGradingState
	) {
		if (state.invalidError) {
			// Invalid state is considered NOT dirty
			return false;
		}
		if (state.mode !== defaultState.mode) {
			return true;
		}
		if (state.mode === QuestionFeedbackMode.Manual) {
			return (
				typeof state.manualPoints !== typeof defaultState.manualPoints ||
				(state.manualPoints !== null &&
					!isDecimalEqual(state.manualPoints, defaultState.manualPoints!)) ||
				state.comments !== defaultState.comments
			);
		}
		const selectedRubricItemIds = Object.keys(state.selectedRubricItems);
		if (
			selectedRubricItemIds.length !== Object(defaultState.selectedRubricItems!).length
		) {
			return true;
		}
		for (const selectedRubricItemId of selectedRubricItemIds) {
			if (!defaultState.selectedRubricItems![selectedRubricItemId]) {
				return true;
			}
		}
		return false;
	}

	public static checkRubricItemCanToggle(
		state: IQuestionGradingState,
		question: Pick<IQuestion, 'points'>,
		rubricItem: DiffRubricItem
	) {
		if (state.invalidError || state.gradingMode === null) {
			// Prevent state change in invalid state
			return false;
		}
		// Most-recent version of rubric item
		const item = rubricItem.new ?? rubricItem.old;

		const currentPoints = Decimal(
			state.points ?? this.getInitialPoints(question.points, state.gradingMode)
		);
		let newPoints: Decimal;
		if (state.selectedRubricItems?.[item.id]) {
			// Rubric item already selected, test subtraction
			newPoints = currentPoints.sub(item.points);
		} else {
			// Either rubric item not selected or has manual points override or no feedback
			// Test addition
			newPoints = currentPoints.add(item.points);
		}
		return isDecimalWithinRange(newPoints, 0, question.points);
	}

	public static toggleSelectRubricItem(
		state: IQuestionGradingState,
		defaultState: IQuestionGradingState,
		question: Pick<IQuestion, 'points'>,
		rubricItem: DiffRubricItem
	): IQuestionGradingState {
		if (state.invalidError || state.gradingMode === null) {
			// Prevent state change in invalid state
			return state;
		}
		// Most-recent version of rubric item
		const item = rubricItem.new ?? rubricItem.old;

		let newState: IQuestionGradingState;
		if (state.mode === QuestionFeedbackMode.Manual) {
			// Current state has manual points override or no feedback, select item and initialize points
			const newPoints = Decimal.add(
				this.getInitialPoints(question.points, state.gradingMode),
				item.points
			);
			newState = {
				mode: QuestionFeedbackMode.Rubric,
				gradingMode: state.gradingMode,
				points: newPoints.toString(),
				selectedRubricItems: { [item.id]: true },
				manualPoints: null,
				comments: state.comments,
				rubricItems: state.rubricItems,
				isDirty: true,
				invalidError: null,
			};
		} else if (state.selectedRubricItems[item.id]) {
			// Selected rubric items, toggle selection and update state
			// Deselect rubric item and subtract from total points
			const newPoints = Decimal.sub(state.points, item.points);
			const { [item.id]: _, ...remainingSelectedRubricItems } = state.selectedRubricItems;
			if (Object.keys(remainingSelectedRubricItems).length === 0) {
				// All selected rubric items cleared, reset to no-feedback state
				newState = {
					mode: QuestionFeedbackMode.Manual,
					gradingMode: state.gradingMode,
					points: null,
					selectedRubricItems: null,
					manualPoints: null,
					comments: state.comments,
					rubricItems: state.rubricItems,
					isDirty: true,
					invalidError: null,
				};
			} else {
				newState = {
					mode: QuestionFeedbackMode.Rubric,
					gradingMode: state.gradingMode,
					points: newPoints.toString(),
					selectedRubricItems: remainingSelectedRubricItems,
					manualPoints: null,
					comments: state.comments,
					rubricItems: state.rubricItems,
					isDirty: true,
					invalidError: null,
				};
			}
		} else {
			// Select rubric item and add to total points
			const newPoints = Decimal.add(state.points, item.points);
			newState = {
				mode: QuestionFeedbackMode.Rubric,
				gradingMode: state.gradingMode,
				points: newPoints.toString(),
				selectedRubricItems: { ...state.selectedRubricItems, [item.id]: true },
				manualPoints: null,
				comments: state.comments,
				rubricItems: state.rubricItems,
				isDirty: true,
				invalidError: null,
			};
		}
		newState.isDirty = this.isDirty(newState, defaultState);
		return newState;
	}

	public static applyManualPoints(
		state: IQuestionGradingState,
		defaultState: IQuestionGradingState,
		manualPoints: string
	): IQuestionGradingState {
		if (state.invalidError) {
			// Invalid state
			return state;
		}
		const newState: IQuestionGradingState = {
			mode: QuestionFeedbackMode.Manual,
			gradingMode: state.gradingMode,
			points: null,
			selectedRubricItems: null,
			manualPoints,
			comments: state.comments,
			rubricItems: state.rubricItems,
			isDirty: true,
			invalidError: null,
		};
		newState.isDirty = this.isDirty(newState, defaultState);
		return newState;
	}

	public static updateComments(
		state: IQuestionGradingState,
		defaultState: IQuestionGradingState,
		comments: string
	): IQuestionGradingState {
		if (comments === state.comments) {
			return state;
		}
		const newState = { ...state, comments, isDirty: true };
		newState.isDirty = this.isDirty(newState, defaultState);
		return newState;
	}

	public static getGradingComments(state: IQuestionGradingState) {
		const userComments = state.comments.trim();
		if (state.mode === QuestionFeedbackMode.Manual) {
			return userComments;
		}
		let comments = '';
		for (const rubricItem of state.rubricItems) {
			if (!state.selectedRubricItems[rubricItem.id]) continue;
			const item = rubricItem.new ?? rubricItem.old;
			comments += `(${isDecimalPositive(item.points) ? '+' : ''}${item.points}) ${item.description}\n`;
		}
		if (userComments) {
			comments += `\n${userComments}`;
		}
		return comments.trim();
	}

	public static toPersistentState(
		state: IQuestionGradingState,
		questionId: IQuestion['id']
	): Nullable<QuestionFeedback> {
		if (state.invalidError) {
			return null;
		}
		if (
			state.manualPoints === null &&
			state.selectedRubricItems === null &&
			!state.comments.trim()
		) {
			// No feedback provided, nothing to save
			return null;
		}
		if (state.mode === QuestionFeedbackMode.Manual) {
			return {
				questionId,
				gradingMode: null,
				rubricItems: null,
				manualPoints: state.manualPoints,
				comments: state.comments,
			};
		}
		// Rubric items selected
		return {
			questionId,
			gradingMode: state.gradingMode,
			manualPoints: null,
			rubricItems: state.rubricItems.flatMap((rubricItem) => {
				if (!state.selectedRubricItems[rubricItem.id]) {
					return [];
				}
				return rubricItem.new ?? rubricItem.old;
			}),
			comments: state.comments,
		};
	}

	public static markAsClean(state: IQuestionGradingState): IQuestionGradingState {
		if (!state.isDirty) {
			return state;
		}
		return { ...state, isDirty: false };
	}
}
