import type { IRubric } from '~/models/Rubric';
import type { QuizInjectorType } from '~/services/content/QuizInjector';
import type { QuizLoaderType } from '~/services/content/QuizLoader';
import { RubricEditorType } from '~/ui/components/RubricAccordion';

export type AppSettings = {
	hideAnswerBoxes: boolean;
	scrollToLastGradedQuestion: boolean;
	defaultRubricEditor: RubricEditorType;
	defaultGradingMode: IRubric['gradingMode'];
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
	hideAnswerBoxes: false,
	scrollToLastGradedQuestion: true,
	defaultRubricEditor: RubricEditorType.list,
	defaultGradingMode: 'positive',
	defaultQuizInjector: 'oldSG',
	defaultQuizLoader: 'oldSG',

	hotkeys: {
		quizSubmitFeedback: 'ctrl+s',
		quizNextSubmission: 'ctrl+.',
		quizPrevSubmission: 'ctrl+,',
	},
};
