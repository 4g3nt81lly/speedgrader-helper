import type { QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import type { GradingMode } from '#models/Rubric';
import type { IRubricItem } from '#models/RubricItem';
import type { Nullable } from '#shared/types/utils';
import { useGradingContext } from './main.store';

export type QuestionGradingState = {
	question: IQuestion;
	boxState: Nullable<QuestionGradingBoxState>;
	sgState: SGFeedbackState;
	sgElements: SGQuestionDOMElements;
	/** Most-recent feedback object submitted and saved to local storage */
	savedFeedback: Nullable<QuestionFeedback>;
	isRegrading: boolean;
};

export const useQuestionGradingState = (questionId: IQuestion['id']) => {
	const state = useGradingContext((context) => context.gradingStates[questionId]);
	if (!state) {
		throw new Error('Fatal error: Missing question grading state.');
	}
	return state;
};

export type QuestionGradingBoxState = RawGradingState & {
	gradingMode: GradingMode;
	rubricItems: DiffRubricItem[];
} & PeripheralGradingState;

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

type PeripheralGradingState = (
	| { readOnly: false; isDirty: boolean }
	| { readOnly: true; isDirty: false }
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
