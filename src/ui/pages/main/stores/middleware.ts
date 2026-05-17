import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import type { MainPageDispatch, MainPageStates } from './main.store';
import { saveSelectionStateToLocalStorage } from './selection.actions';
import { selectMainTab, selectQuiz } from './selection.slice';

export const listenerMiddleware = createListenerMiddleware();

const startListening = listenerMiddleware.startListening.withTypes<
	MainPageStates,
	MainPageDispatch
>();

startListening({
	matcher: isAnyOf(selectMainTab, selectQuiz),
	async effect(_action, { dispatch }) {
		console.log('Saving selection state to local storage...');
		dispatch(saveSelectionStateToLocalStorage());
	},
});
