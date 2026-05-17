import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { MainTab } from '@shared/enums';
import type { Nullable } from '~/types/utils';
import {
	loadSelectionStateFromLocalStorage,
	saveSelectionStateToLocalStorage,
} from './selection.actions';
import type { MainPageStates } from './main.store';

const selectionSlice = createSlice({
	name: 'selection',
	initialState: <MainPageStates['selection']>{
		mainTab: MainTab.Dashboard,
		quiz: null,
	},
	reducers: {
		selectMainTab(selection, { payload: tab }: PayloadAction<MainTab>) {
			selection.mainTab = tab;
		},
		selectQuiz(selection, { payload: quizId }: PayloadAction<Nullable<string>>) {
			selection.quiz = quizId;
		},
	},
	extraReducers(builder) {
		builder
			.addCase(
				loadSelectionStateFromLocalStorage.fulfilled,
				(selection, { payload: newSelection }) => {
					selection.mainTab = newSelection.mainTab;
					selection.quiz = newSelection.quiz;
				}
			)
			.addCase(loadSelectionStateFromLocalStorage.rejected, (_, { error }) => {
				console.error('Failed to load selection state from local storage:', error);
				alert('Failed to load selection state from local storage');
			});

		builder.addCase(saveSelectionStateToLocalStorage.rejected, (_, { error }) => {
			console.error('Failed to save selection state to local storage:', error);
			alert('Failed to save selection state to local storage');
		});
	},
});

export const { selectMainTab, selectQuiz } = selectionSlice.actions;

export default selectionSlice.reducer;
