import QuizLocalStore from '#shared/stores/QuizLocalStore';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { MainPageThunkAPI } from './main.store';
import { loadQuizzes } from './quizzes.slice';
import { selectQuiz } from './selection.slice';

export const loadQuizzesFromLocalStore = createAsyncThunk<void, void, MainPageThunkAPI>(
	'quizzes/load-from-local-store',
	async (_, { getState, dispatch }) => {
		try {
			var quizzes = await QuizLocalStore.getQuizzes();
		} catch (error) {
			console.error('Failed to load quizzes from local storage:', error);
			return alert('Failed to load quizzes from local storage');
		}
		const selectedQuizId = getState().selection.quiz;
		if (!quizzes.find((quiz) => quiz.id === selectedQuizId)) {
			dispatch(selectQuiz(null));
		}
		dispatch(loadQuizzes(quizzes));
	}
);
