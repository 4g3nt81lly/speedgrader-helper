import type { IQuestion } from '#models/Question';
import type { IQuiz } from '#models/Quiz';
import { defaultAppSettings, type AppSettings } from '#shared/settings';
import type { Nullable } from '#shared/types/utils';
import { createSelectors } from '#shared/utils/browser/hooks';
import { create } from 'zustand';
import type { QuestionGradingState } from './QuestionGradingState';

export type ContentStore = {
	appSettings: AppSettings;
	gradingContext: Nullable<GradingContext>;
};

export type GradingContext = {
	quiz: IQuiz;
	gradingStates: Record<IQuestion['id'], QuestionGradingState>;
	dirtyQuestions: Set<IQuestion['id']>;
	lastGradedQuestionId: Nullable<IQuestion['id']>;

	submissionId: string;
	submissionWindow: Window;
	submissionForm: HTMLFormElement;
	isFeedbackSubmitting: boolean;
};

export const useContentStore = create<ContentStore>()(() => ({
	appSettings: defaultAppSettings,
	gradingContext: null,
}));

export const {
	use: { appSettings: useAppSettings },
} = createSelectors(useContentStore);

interface GradingContextSelector {
	(): GradingContext;
	<K extends keyof GradingContext>(selector: K): GradingContext[K];
	<V>(selector: (context: GradingContext) => V): V;
}

export const useGradingContext: GradingContextSelector = function <
	K extends keyof GradingContext,
	V,
>(
	selector?: K | ((context: GradingContext) => V)
): GradingContext | GradingContext[K] | V {
	return useContentStore((store) => {
		const gradingContext = store.gradingContext;
		if (!gradingContext) {
			throw new Error('Fatal error: Missing grading context.');
		}
		if (typeof selector === 'string') {
			return gradingContext[selector];
		}
		if (typeof selector === 'function') {
			return selector(gradingContext);
		}
		return gradingContext;
	});
};
