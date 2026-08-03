import type { IQuiz } from '#models/Quiz';
import { defaultAppSettings, type AppSettings } from '#shared/settings';
import type { Nullable } from '#shared/types/utils';
import StateStore from '#shared/utils/browser/StateStore';

export type MainPageState = {
	quizzes: Record<IQuiz['id'], IQuiz>;
	selection: {
		mainTab: MainTab;
		quiz: Nullable<IQuiz['id']>;
	};
	settings: AppSettings;
};

export type MainTab = 'dashboard' | 'settings';

export const mainPageState = new StateStore<MainPageState>({
	quizzes: {},
	selection: {
		mainTab: 'dashboard',
		quiz: null,
	},
	settings: defaultAppSettings,
});
