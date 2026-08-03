import type { IQuestion } from '#models/Question';
import type { IQuiz } from '#models/Quiz';
import type { Nullable } from '#shared/types/utils';
import { store } from '.';
import type { QuestionGradingState } from './QuestionGradingState';

export type GradingContext = {
	quiz: IQuiz;
	gradingStates: Record<IQuestion['id'], QuestionGradingState>;
	lastGradedQuestionId: Nullable<IQuestion['id']>;

	submissionId: string;
	submissionWindow: Window;
	submissionForm: HTMLFormElement;
	isFeedbackSubmitting: boolean;
};

export const useGradingContext: {
	(): GradingContext;
	<K extends keyof GradingContext>(selector: K): GradingContext[K];
	<V>(selector: (context: GradingContext) => V): V;
} = <K extends keyof GradingContext, V>(
	selector?: K | ((context: GradingContext) => V)
) =>
	store.useStore((store) => {
		const gradingContext = store.gradingContext;
		if (!gradingContext) {
			throw new Error('Fatal error: missing grading context');
		}
		if (typeof selector === 'string') {
			return gradingContext[selector];
		}
		if (typeof selector === 'function') {
			return selector(gradingContext);
		}
		return gradingContext;
	});
