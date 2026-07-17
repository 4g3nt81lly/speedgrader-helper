import type { IQuiz } from '#models/Quiz';
import { defaultAppSettings, type AppSettings } from '#shared/settings';
import type { MainTab } from '#shared/types/store';
import type { Nullable } from '#shared/types/utils';
import { createSelectors } from '#shared/utils/browser/hooks';
import { create } from 'zustand';

type MainPageState = {
	quizzes: Record<IQuiz['id'], IQuiz>;
	selection: {
		mainTab: MainTab;
		quiz: Nullable<IQuiz['id']>;
	};
	settings: AppSettings;
};

export const useMainPageStore = create<MainPageState>()(() => ({
	quizzes: {},
	selection: {
		mainTab: 'dashboard',
		quiz: null,
	},
	settings: defaultAppSettings,
}));

export const {
	use: {
		quizzes: useMainQuizzes,
		selection: useMainSelection,
		settings: useMainAppSettings,
	},
} = createSelectors(useMainPageStore);
