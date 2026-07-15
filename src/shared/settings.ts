import type { QuizLoaderType } from '#background/loader';
import type { QuizInjectorType } from '#content/modules';
import type { FeedbackSubmissionStrategy } from '#content/submit';
import type { GradingMode } from '#models/Rubric';
import type { RubricEditorType } from '#sidepanel/components/RubricAccordion';
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

	hotkeys: AppHotKeySettings;
};

export type AppHotKeySettings = {
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
