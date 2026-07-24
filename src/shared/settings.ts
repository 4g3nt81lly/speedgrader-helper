import type { GradingMode } from '#models/Rubric';
import type { QuizInjectorType } from './types/injector';
import type { QuizLoaderType } from './types/loader';
import type { FeedbackSubmissionStrategy } from './types/strategy';
import type { Nullable } from './types/utils';

export type AppSettings = {
	scrollToLastGradedQuestion: boolean;
	feedbackSubmissionStrategy: FeedbackSubmissionStrategy;

	defaultRubricEditor: RubricEditorType;
	defaultGradingMode: GradingMode;
	defaultQuizInjector: QuizInjectorType;
	defaultQuizLoader: QuizLoaderType;

	canvasBaseURL: string;
	canvasAccessToken: Nullable<string>;

	hotkeys: AppHotkeySettings;
};

export type RubricEditorType = 'list' | 'text';

export type AppHotkeySettings = {
	quizSubmitFeedback: string;
	quizNextSubmission: string;
	quizPrevSubmission: string;
};

export const defaultAppSettings: AppSettings = {
	scrollToLastGradedQuestion: true,
	feedbackSubmissionStrategy: 'focused',

	defaultRubricEditor: 'list',
	defaultGradingMode: 'positive',
	defaultQuizInjector: 'oldSG',
	defaultQuizLoader: 'oldSG',

	canvasBaseURL: import.meta.env.VITE_CANVAS_BASE_URL!,
	canvasAccessToken: import.meta.env.VITE_CANVAS_ACCESS_TOKEN ?? null,

	hotkeys: {
		quizSubmitFeedback: 'meta+s',
		quizNextSubmission: 'ctrl+period',
		quizPrevSubmission: 'ctrl+comma',
	},
};
