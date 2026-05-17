import type { IQuiz } from '@models/Quiz';
import { configureStore } from '@reduxjs/toolkit';
import { useReduxSelector } from '@shared/hooks';
import type { MainTab } from '~/shared/enums';
import type { Nullable } from '~/types/utils';
import { listenerMiddleware } from './middleware';
import quizzes from './quizzes.slice';
import selection from './selection.slice';

export type MainPageStates = {
	quizzes: Record<string, IQuiz>;
	selection: {
		mainTab: MainTab;
		quiz: Nullable<string>;
	};
};

const store = configureStore({
	reducer: {
		quizzes,
		selection,
	},
	middleware(getDefaultMiddleware) {
		return getDefaultMiddleware().prepend(listenerMiddleware.middleware);
	},
});

export default store;

export const useMainSelector = useReduxSelector.withType<MainPageStates>();

export type MainPageDispatch = typeof store.dispatch;
export type MainPageThunkAPI = {
	state: MainPageStates;
};
