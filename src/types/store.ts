import type { IQuiz } from '@models/Quiz';
import type { MainTab } from '@shared/enums';
import type { ISubmissionFeedback } from '~/models/Feedback';
import type { IQuestion } from '~/models/Question';
import type { Nullable } from './utils';

export type ILocalStore = {
	quizzes: StoreQuizIndex[];
	[quizId: StoreQuizIdKey]: IQuiz;

	[quizUrl: StoreQuizUrlKey]: StoreQuizIdKey;

	[quizFeedback: StoreQuizFeedbackKey]: StoreQuizSubmissionFeedbackKey[];
	[quizSubmissionFeedback: StoreQuizSubmissionFeedbackKey]: ISubmissionFeedback;

	[quizLastSavedQuestionId: StoreQuizLastGradedQuestionIdKey]: IQuestion['id'];
} & {
	selection: {
		mainTab: MainTab;
		quiz: Nullable<IQuiz['id']>;
	};
};

export type StoreQuizIndex = {
	idKey: StoreQuizIdKey;
	urlKey: StoreQuizUrlKey;
};

export type StoreQuizIdKey = `quiz:${IQuiz['id']}`;
export type StoreQuizUrlKey = `quizUrl:${IQuiz['url']}`;

export type StoreQuizLastGradedQuestionIdKey = `quizLastGradedQuestion:${IQuiz['id']}`;

export type StoreQuizFeedbackKey = `quizFeedback:${IQuiz['id']}`;
export type StoreQuizSubmissionFeedbackKey =
	`quizSubmissionFeedback:${IQuiz['id']}:${string}`;
