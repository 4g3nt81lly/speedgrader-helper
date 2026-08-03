import type { QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import type { GradingMode } from '#models/Rubric';
import type { IRubricItem } from '#models/RubricItem';
import type { Nullable } from '#shared/types/utils';
import { useGradingContext } from './GradingContext';

export type QuestionGradingState = {
	question: IQuestion;
	boxState: QuestionGradingBoxState;
	sgState: SGFeedbackState;
	sgElements: SGQuestionDOMElements;
	/** Most-recent feedback object submitted and saved to local storage */
	savedFeedback: Nullable<QuestionFeedback>;
	isRegrading: boolean;
};

export const useQuestionGradingState: {
	(id: IQuestion['id']): QuestionGradingState;
	<K extends keyof QuestionGradingState>(
		questionId: IQuestion['id'],
		key: K
	): QuestionGradingState[K];
	<V>(id: IQuestion['id'], selector: (state: QuestionGradingState) => V): V;
} = <K extends keyof QuestionGradingState, V>(
	id: IQuestion['id'],
	selector?: K | ((state: QuestionGradingState) => V)
) => {
	return useGradingContext((context) => {
		const state = context.gradingStates[id];
		if (!state) {
			throw new Error('Fatal error: missing question grading state');
		}
		if (typeof selector === 'string') {
			return state[selector];
		}
		if (typeof selector === 'function') {
			return selector(state);
		}
		return state;
	});
};

export type QuestionGradingBoxState = CoreQuestionGradingBoxState &
	PeripheralQuestionGradingBoxState;

type CoreQuestionGradingBoxState = (
	| {
			// No rubrics, no feedback
			gradingMode: null;
			rubricItems: null;
			selectedRubricItems: null;
			points: Nullable<string>;
	  }
	| ({
			// Has rubrics or feedback
			gradingMode: GradingMode;
			rubricItems: DiffRubricItem[];
	  } & (
			| {
					// No feedback, no selection/manual points
					selectedRubricItems: null;
					points: null;
			  }
			| {
					// No feedback, manual points
					selectedRubricItems: null;
					points: string;
			  }
			| {
					// No feedback, selected rubric items
					selectedRubricItems: Record<IRubricItem['id'], true>;
					points: string;
			  }
	  ))
) & { comments: string };

type PeripheralQuestionGradingBoxState = (
	{ readOnly: false; isDirty: boolean } | { readOnly: true; isDirty: false }
) & {
	/** An object describing the diffs between current state and SpeedGrader state */
	stateDiff: {
		/** True if SG points has diverged from last saved: invalid, ungraded, or distinct */
		points: boolean;
		/** Last-saved comments if SG comments has diverged */
		comments: Nullable<string>;
	};
	message: Nullable<string>;
};

export type SGFeedbackState = {
	/** Points value in SpeedGrader: empty if ungraded, nonempty if graded, `null` if invalid */
	points: Nullable<string>;
	/** Comments value in SpeedGrader */
	comments: string;
};

export type SGQuestionDOMElements = {
	container: HTMLElement;
	text: HTMLElement;
	pointsInput: HTMLInputElement;
	commentsTextarea: HTMLTextAreaElement;
};

export type DiffRubricItem = { id: IRubricItem['id'] } & (
	| {
			status: 'unchanged';
			new: IRubricItem;
			old: IRubricItem;
	  }
	| {
			status: 'new';
			new: IRubricItem;
			old: null;
	  }
	| {
			status: 'modified';
			new: IRubricItem;
			old: IRubricItem;
	  }
	| {
			status: 'removed';
			new: null;
			old: IRubricItem;
	  }
);
