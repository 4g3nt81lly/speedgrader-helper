import type { IQuizSubmissionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import type { IQuiz } from '#models/Quiz';
import type { AppSettings } from '#shared/settings';
import type { Nullable } from '#shared/types/utils';
import type { DBSchema, IDBPTransaction, StoreNames } from 'idb';

export interface LocalStorageSchema {
	settings: AppSettings;
	selection: {
		mainTab: 'dashboard' | 'settings';
		quiz: Nullable<IQuiz['id']>;
	};
}

export interface MainIDBSchema extends DBSchema {
	quizzes: {
		key: IQuiz['id'];
		value: IQuiz;
		indexes: {
			'by-url': IQuiz['url'];
		};
	};

	quizLastGradedQuestions: {
		key: IQuiz['id'];
		value: IQuestion['id'];
	};

	quizSubmissionFeedback: {
		key: `${IQuiz['id']}:${string}`;
		value: IQuizSubmissionFeedback;
	};
}

export type MainIDBTransaction<
	Mode extends Exclude<IDBTransactionMode, 'versionchange'>,
> = IDBPTransaction<MainIDBSchema, ArrayLike<StoreNames<MainIDBSchema>>, Mode>;
