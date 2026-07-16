import type { IQuiz } from '#models/Quiz';
import type { AppSettings } from '#shared/settings';
import type { MainTab } from '#shared/types/store';
import type { Nullable } from '#shared/types/utils';
import { useReduxSelector } from '#shared/utils/browser/hooks';
import { configureStore } from '@reduxjs/toolkit';
import quizzes from './quizzes.slice';
import selection from './selection.slice';
import settings from './settings.slice';

export type MainPageStates = {
	quizzes: Record<string, IQuiz>;
	selection: {
		mainTab: MainTab;
		quiz: Nullable<string>;
	};
	settings: AppSettings;
};

const store = configureStore({
	reducer: {
		quizzes,
		selection,
		settings,
	},
});

export default store;

export const useMainSelector = useReduxSelector.withType<MainPageStates>();

export type MainPageDispatch = typeof store.dispatch;
export type MainPageThunkAPI = {
	state: MainPageStates;
};
