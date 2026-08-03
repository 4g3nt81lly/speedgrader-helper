import type { IQuizSubmissionFeedback, QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import type { IQuiz } from '#models/Quiz';
import type { AppSettings } from '#shared/settings';
import type { QuizLoaderPayloadMap, QuizLoaderType, SGQuizLoaderType } from './loader';
import type { Nullable } from './utils';

export type Message<Context extends MessageContext, Name extends MessageName<Context>> = {
	name: Name;
} & MessagePayload<Context, Name>;

export type MessageResponse<T = any> =
	{ error: { message: string }; data?: T } | { data: T; error?: undefined };

type BackgroundMessage = {
	'app.updateSettings': {
		payload: {
			partial: Partial<AppSettings>;
		};
		result: Promise<true>;
	};
	'app.factoryReset': {
		payload: {};
		result: Promise<true>;
	};

	'quizzes.load': {
		payload: QuizLoaderPayloadMap[QuizLoaderType];
		result: Promise<IQuiz>;
	};
	'quizzes.getByID': {
		payload: { id: IQuiz['id'] };
		result: Promise<Nullable<IQuiz>>;
	};
	'quizzes.getByURL': {
		payload: { url: IQuiz['url'] };
		result: Promise<Nullable<IQuiz>>;
	};
	'quizzes.add': {
		payload: { quiz: IQuiz };
		result: Promise<true>;
	};
	'quizzes.set': {
		payload: { quiz: IQuiz };
		result: Promise<true>;
	};
	'quizzes.remove': {
		payload: { quizIds: IQuiz['id'][] };
		result: Promise<true>;
	};
	'quizzes.clear': {
		payload: {};
		result: Promise<true>;
	};
	'quizzes.getFeedback': {
		payload: {
			quizId: IQuiz['id'];
			submissionId: string;
		};
		result: Promise<Nullable<IQuizSubmissionFeedback>>;
	};
	'quizzes.updateFeedback': {
		payload: {
			quizId: IQuiz['id'];
			submissionId: string;
			feedback: Record<IQuestion['id'], Nullable<QuestionFeedback>>;
		};
		result: Promise<true>;
	};
	'quizzes.getLastGradedQuestion': {
		payload: { quizId: IQuiz['id'] };
		result: Promise<Nullable<IQuestion['id']>>;
	};
	'quizzes.updateLastGradedQuestion': {
		payload: {
			quizId: IQuiz['id'];
			questionId: Nullable<IQuestion['id']>;
		};
		result: Promise<true>;
	};
};

type ContentMessage = {
	'app.reloadSettings': {
		payload: {};
		result: void;
	};
	'app.reloadPage': {
		payload: { urls?: IQuiz['url'][] };
		result: void;
	};

	'quiz.load': {
		payload: { loader: SGQuizLoaderType };
		result: Promise<IQuiz>;
	};
	'quiz.reload': {
		payload: {};
		result: void;
	};
};

type MessageMap = {
	background: BackgroundMessage;
	content: ContentMessage;
};

export type MessageContext = keyof MessageMap;

export type MessageName<Context extends MessageContext> = keyof MessageMap[Context];

export type MessagePayload<
	Context extends MessageContext,
	Name extends MessageName<Context>,
	// @ts-expect-error: Not sure why TypeScript is complaining about this
> = MessageMap[Context][Name]['payload'];

export type MessageHandlerResult<
	Context extends MessageContext,
	Name extends MessageName<Context>,
	// @ts-expect-error: Not sure why TypeScript is complaining about this
> = MessageMap[Context][Name]['result'];
