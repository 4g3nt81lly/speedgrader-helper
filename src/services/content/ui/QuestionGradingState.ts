import type { QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import type { GradingMode, IRubric } from '#models/Rubric';
import type { IRubricItem } from '#models/RubricItem';
import {
	isDecimal,
	isDecimalEqual,
	isDecimalPositive,
	isDecimalWithinRange,
} from '#shared/decimal';
import type { Nullable } from '#shared/types/utils';
import Decimal from 'decimal.js';

export type IQuestionGradingState = RawGradingState & {
	gradingMode: GradingMode;
	rubricItems: DiffRubricItem[];
	isDirty: boolean;
	isGradable: boolean;
	/** An object describing the diffs between current state and SpeedGrader state */
	stateDiff: {
		/** True if SG points has diverged from last saved: invalid, ungraded, or distinct */
		points: boolean;
		/** Last-saved comments if SG comments has diverged */
		comments: Nullable<string>;
	};
	message: Nullable<string>;
};

type RawGradingState = { comments: string } & (
	| {
			selectedRubricItems: null;
			points: null;
	  }
	| {
			selectedRubricItems: null;
			points: string;
	  }
	| {
			selectedRubricItems: Record<IRubricItem['id'], true>;
			points: string;
	  }
);

export type SGFeedbackState = {
	/** Points value in SpeedGrader: empty if ungraded, nonempty if graded, `null` if invalid */
	points: Nullable<string>;
	/** Comments value in SpeedGrader */
	comments: string;
};

export const enum DiffDescriptor {
	noChange = 0,
	new = 1,
	modified = 2,
	removed = 3,
}

export type DiffRubricItem = { id: IRubricItem['id'] } & (
	| {
			status: DiffDescriptor.noChange;
			new: IRubricItem;
			old: IRubricItem;
	  }
	| {
			status: DiffDescriptor.new;
			new: IRubricItem;
			old: null;
	  }
	| {
			status: DiffDescriptor.modified;
			new: IRubricItem;
			old: IRubricItem;
	  }
	| {
			status: DiffDescriptor.removed;
			new: null;
			old: IRubricItem;
	  }
);

export class QuestionGradingState {
	public static createSGState(
		rawState: { points: string; comments: string },
		question: Pick<IQuestion, 'points'>
	): SGFeedbackState {
		let sgPoints: Nullable<string> = rawState.points;
		if (
			sgPoints &&
			(!isDecimal(sgPoints) || !isDecimalWithinRange(sgPoints, 0, question.points))
		) {
			sgPoints = null;
		}
		return { points: sgPoints, comments: rawState.comments };
	}

	public static create(
		question: IQuestion,
		feedback: Nullable<QuestionFeedback>,
		sgState: SGFeedbackState
	): Nullable<IQuestionGradingState> {
		const rubricItems = this.getDiffRubricItems(question.rubric, feedback);
		if (rubricItems.length === 0) {
			return null;
		}
		if (!feedback) {
			// Feedback object does not exist, question rubric must be present
			// Gradable iff question is ungraded
			const message = sgState.points
				? 'This question has already been graded.'
				: sgState.points === null
					? 'Points awarded in SpeedGrader is not valid.'
					: null;
			const state: IQuestionGradingState = {
				selectedRubricItems: null,
				comments: '',
				points: null,
				gradingMode: question.rubric!.gradingMode,
				rubricItems,
				isDirty: false,
				isGradable: sgState.points === '',
				stateDiff: { points: false, comments: null },
				message,
			};
			state.isDirty = this.isDirty(state, sgState);
			return state;
		}
		// Feedback object exists, not gradable
		const comments = feedback.comments;
		const selectedRubricItems: IQuestionGradingState['selectedRubricItems'] = {};
		// Calculate original points using feedback object
		let feedbackPoints = Decimal(
			this.getInitialPoints(question.points, feedback.gradingMode)
		);
		// Calculate current points using current rubric object, if any
		let rubricPoints: Nullable<Decimal> = null;
		if (question.rubric) {
			rubricPoints = Decimal(
				this.getInitialPoints(question.points, question.rubric.gradingMode)
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

		const oldComments = this.getFeedbackComments(feedback);
		const state: IQuestionGradingState = {
			selectedRubricItems,
			points: oldPoints,
			comments,
			gradingMode: feedback.gradingMode,
			rubricItems,
			isDirty: false,
			isGradable: false,
			stateDiff: {
				points: !sgState.points || !isDecimalEqual(oldPoints, sgState.points),
				comments: sgState.comments === oldComments ? null : oldComments,
			},
			message: null,
		};
		if (rubricPoints === null) {
			// Rubric was removed since last graded
			state.message = 'The rubric has been removed since last graded. Please review.';
			return state;
		}
		// Question rubric still exists
		if (isDecimalEqual(feedbackPoints, rubricPoints)) {
			// Same points but may or may not have been modified
			state.message = rubricItems.some(
				({ status }) =>
					status === DiffDescriptor.modified || status === DiffDescriptor.removed
			)
				? 'The rubric has been updated since last graded.'
				: null;
			return state;
		}
		// New question rubric yields different points than before
		const newPoints = rubricPoints.toString();
		const newPointsIsValid = isDecimalWithinRange(rubricPoints, 0, question.points);
		// If points already diverged, do not show the message to avoid overwhelming the user
		if (!state.stateDiff.points) {
			state.message = `The rubric has been updated since last graded: old rubric awarded "${oldPoints}" points but new rubric awards "${newPoints}" points${newPointsIsValid ? '' : ' (which is invalid)'}. Please consider regrading this question.`;
		}
		return state;
	}

	public static getDiffRubricItems(
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
					status: isModified ? DiffDescriptor.modified : DiffDescriptor.noChange,
					new: rubricItem,
					old: selectedRubricItem,
				});
				selectedRubricItemIds.add(rubricItem.id);
			} else {
				// Selected rubric item was removed
				diffItems.push({
					id: selectedRubricItem.id,
					status: DiffDescriptor.removed,
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
				status: DiffDescriptor.new,
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

	private static isDirty(state: IQuestionGradingState, sgState: SGFeedbackState) {
		if (!state.isGradable) {
			// Invalid state is not comparable and is considered NOT dirty
			return false;
		}
		const points = state.points;
		const { points: sgPoints, comments: sgComments } = sgState;
		// Points is unchanged if
		// 1. Points is null (empty)
		// 2. Points and SG points are non-empty and equal
		const pointsUnchanged =
			points === null || (sgPoints && isDecimalEqual(points, sgPoints));
		if (!pointsUnchanged) {
			return true;
		}
		return this.getComments(state) !== sgComments;
	}

	public static checkRubricItemCanToggle(
		state: IQuestionGradingState,
		question: Pick<IQuestion, 'points'>,
		rubricItem: DiffRubricItem
	) {
		if (!state.isGradable) {
			// Prevent state change in invalid state
			return false;
		}
		if (!state.selectedRubricItems) {
			// No selected rubric items yet, always toggle-able since no rubric item can have points
			// with magnitude greater than the max points anyways
			return true;
		}
		// Most-recent version of rubric item
		const item = rubricItem.new ?? rubricItem.old;

		let newPoints = Decimal(state.points);
		if (state.selectedRubricItems[item.id]) {
			// Rubric item already selected, test subtraction
			newPoints = newPoints.sub(item.points);
		} else {
			// Either rubric item not selected or has manual points override or no feedback
			// Test addition
			newPoints = newPoints.add(item.points);
		}
		return isDecimalWithinRange(newPoints, 0, question.points);
	}

	public static toggleSelectRubricItem(
		state: IQuestionGradingState,
		sgState: SGFeedbackState,
		question: Pick<IQuestion, 'points'>,
		rubricItem: DiffRubricItem
	): IQuestionGradingState {
		if (!state.isGradable) {
			// Prevent state change in invalid state
			return state;
		}
		// Most-recent version of rubric item
		const item = rubricItem.new ?? rubricItem.old;

		const newState: IQuestionGradingState = { ...state };
		// Selected rubric items, toggle selection and update state
		const newSelectedRubricItems = { ...state.selectedRubricItems };
		let newPoints = Decimal(
			state.selectedRubricItems
				? state.points
				: this.getInitialPoints(question.points, state.gradingMode)
		);
		if (newSelectedRubricItems[item.id]) {
			newPoints = newPoints.sub(item.points);
			delete newSelectedRubricItems[item.id];
		} else {
			newPoints = newPoints.add(item.points);
			newSelectedRubricItems[item.id] = true;
		}
		if (Object.keys(newSelectedRubricItems).length > 0) {
			newState.selectedRubricItems = newSelectedRubricItems;
			newState.points = newPoints.toString();
		} else {
			// No rubric items selected, reset to no-feedback state
			newState.selectedRubricItems = null;
			newState.points = null;
		}
		newState.isDirty = this.isDirty(newState, sgState);
		return newState;
	}

	public static applyManualPoints(
		state: IQuestionGradingState,
		sgState: SGFeedbackState,
		manualPoints: string
	) {
		if (!state.isGradable) {
			return state;
		}
		const newState: IQuestionGradingState = {
			...state,
			selectedRubricItems: null,
			points: Decimal(manualPoints).toString(),
		};
		newState.isDirty = this.isDirty(newState, sgState);
		return newState;
	}

	public static updateComments(
		state: IQuestionGradingState,
		sgState: SGFeedbackState,
		newComments: string
	) {
		if (!state.isGradable || newComments === state.comments) {
			return state;
		}
		const newState: IQuestionGradingState = { ...state, comments: newComments };
		newState.isDirty = this.isDirty(newState, sgState);
		return newState;
	}

	private static getRubricComments(rubricItems: IRubricItem[]) {
		if (rubricItems.length === 0) {
			return '';
		}
		return rubricItems
			.map(({ points, description }) => {
				return `(${isDecimalPositive(points) ? '+' : ''}${points}) ${description}`;
			})
			.join('\n');
	}

	private static getFeedbackComments(
		feedback: Pick<QuestionFeedback, 'rubricItems' | 'comments'>
	) {
		const rubricComments = this.getRubricComments(feedback.rubricItems);
		if (!rubricComments) {
			return feedback.comments;
		}
		if (!feedback.comments) {
			return rubricComments;
		}
		return `${rubricComments}\n\n${feedback.comments}`;
	}

	public static getComments(
		state: Pick<IQuestionGradingState, 'rubricItems' | 'selectedRubricItems' | 'comments'>
	) {
		if (!state.selectedRubricItems) {
			return state.comments;
		}
		const rubricComments = this.getRubricComments(
			state.rubricItems.flatMap((rubricItem) => {
				if (!state.selectedRubricItems![rubricItem.id]) return [];
				return rubricItem.new ?? rubricItem.old;
			})
		);
		if (!rubricComments) {
			return state.comments;
		}
		if (!state.comments) {
			return rubricComments;
		}
		return `${rubricComments}\n\n${state.comments}`;
	}

	public static toPersistentState(
		state: Nullable<IQuestionGradingState>,
		questionId: IQuestion['id']
	): Nullable<QuestionFeedback> {
		if (!state) return null;
		if (!state.isGradable) {
			throw new Error('toPersistentState: non-gradable state');
		}
		if (state.selectedRubricItems === null) {
			return null;
		}
		return {
			questionId,
			gradingMode: state.gradingMode,
			rubricItems: state.rubricItems.flatMap((rubricItem) => {
				if (!state.selectedRubricItems[rubricItem.id]) {
					return [];
				}
				return rubricItem.new ?? rubricItem.old;
			}),
			comments: state.comments,
		};
	}
}
