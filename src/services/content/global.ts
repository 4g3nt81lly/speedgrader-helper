import type { IQuestion } from '~/models/Question';
import type { IQuiz } from '~/models/Quiz';
import type { Nullable } from '~/types/utils';

type ContentGlobals = {
	quizId: Nullable<IQuiz['id']>;
	quizLastGradedQuestionId: Nullable<IQuestion['id']>;

	submitFeedback?(navigate?: 'next' | 'prev'): Promise<Nullable<boolean>>;
};

const globals: ContentGlobals = {
	quizId: null,
	quizLastGradedQuestionId: null,
};

export default globals;
