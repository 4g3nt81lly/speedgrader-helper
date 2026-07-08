import type { QuizInjectorType, QuizLoaderType } from '#content/modules';
import type { GradingMode } from '#models/Rubric';
import type { RubricEditorType } from '#sidepanel/components/RubricAccordion';

export type AppSettings = {
	scrollToLastGradedQuestion: boolean;
	defaultRubricEditor: RubricEditorType;
	defaultGradingMode: GradingMode;
	defaultQuizInjector: QuizInjectorType;
	defaultQuizLoader: QuizLoaderType;

	hotkeys: AppHotKeySettings;
};

export type AppHotKeySettings = {
	quizSubmitFeedback: string;
	quizNextSubmission: string;
	quizPrevSubmission: string;
};

export const defaultAppSettings: AppSettings = {
	scrollToLastGradedQuestion: true,
	defaultRubricEditor: 'list',
	defaultGradingMode: 'positive',
	defaultQuizInjector: 'oldSG',
	defaultQuizLoader: 'oldSG',

	hotkeys: {
		quizSubmitFeedback: 'ctrl+s',
		quizNextSubmission: 'ctrl+period',
		quizPrevSubmission: 'ctrl+comma',
	},
};
