import type { QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import type { IQuiz } from '#models/Quiz';
import type { AppSettings } from '#shared/settings';
import type { QuizLoaderPayloadMap, QuizLoaderType, SGQuizLoaderType } from './loader';

export const enum BackgroundCommand {
	updateAppSettings = 0x00,

	loadQuiz,
	addQuizToStore,
	updateQuizInStore,
	removeQuizzesFromStore,

	updateQuestionFeedbackInStore,
	updateQuizLastGradedQuestion,
}

export const enum ContentCommand {
	loadQuiz = 0x10,

	reloadRubric,
	updateFocusState,

	reloadAppSettings,
}

export type RuntimeCommand = BackgroundCommand | ContentCommand;

export type CommandMessage<
	C extends keyof CommandMessagePayload = keyof CommandMessagePayload,
> = { command: C } & CommandMessagePayload[C];

export type MessageResponse<T = any> =
	| { error: { message: string }; data?: T }
	| { data: T; error?: undefined };

export type CommandMessagePayload = {
	/* Background script command */
	[BackgroundCommand.updateAppSettings]: {
		partialSettings: Partial<AppSettings>;
	};

	[BackgroundCommand.loadQuiz]: QuizLoaderPayloadMap[QuizLoaderType];
	[BackgroundCommand.addQuizToStore]: {
		quiz: IQuiz;
	};
	[BackgroundCommand.updateQuizInStore]: {
		quiz: IQuiz;
	};
	[BackgroundCommand.removeQuizzesFromStore]:
		| { quizId: IQuiz['id']; quizIds?: undefined }
		| { quizId?: undefined; quizIds: IQuiz['id'][] };

	[BackgroundCommand.updateQuestionFeedbackInStore]: {
		quizId: IQuiz['id'];
		submissionId: string;
		question:
			| { id?: undefined; feedback: QuestionFeedback }
			| { id: IQuestion['id']; feedback?: undefined };
	};
	[BackgroundCommand.updateQuizLastGradedQuestion]: {
		quizId: IQuiz['id'];
		questionId: IQuestion['id'];
	};

	/* Content script command */
	[ContentCommand.loadQuiz]: {
		loader: SGQuizLoaderType;
	};

	[ContentCommand.reloadRubric]: {
		question: IQuestion;
	};
	[ContentCommand.updateFocusState]:
		| {
				focusMode: 'on';
				target: Record<IQuestion['id'], true>;
		  }
		| {
				focusMode: 'select';
				target: 'all' | Record<IQuestion['id'], boolean> | 'none';
		  }
		| {
				focusMode: 'off';
				target: null;
		  };

	[ContentCommand.reloadAppSettings]: {};
};
