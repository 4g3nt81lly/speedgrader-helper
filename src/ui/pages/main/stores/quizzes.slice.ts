import type { IQuiz } from '@models/Quiz';
import Quiz from '@models/Quiz';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { BackgroundCommand, sendMessageToBackground } from '~/shared/message';
import type { SetOptional, SetRequired } from '~/types/utils';
import { reloadSpeedGraderPages, syncSidePanelStates } from './helpers';

const quizzesSlice = createSlice({
	name: 'quizzes',
	initialState: <Record<string, IQuiz>>{},
	reducers: {
		add(
			quizzes,
			{ payload: quiz }: PayloadAction<SetOptional<Omit<IQuiz, 'id'>, 'questions'>>
		) {
			const newQuiz = Quiz.create(quiz);
			const oldQuiz = Object.values(quizzes).find(
				(oldQuiz) => oldQuiz.url === newQuiz.url
			);
			if (oldQuiz) {
				delete quizzes[oldQuiz.id];
			}
			quizzes[newQuiz.id] = newQuiz;

			sendMessageToBackground({
				command: BackgroundCommand.addQuizToStore,
				quiz: newQuiz,
			}).then(() => {
				reloadSpeedGraderPages(newQuiz.url);
				syncSidePanelStates();
			});
		},
		set(quizzes, { payload: newQuiz }: PayloadAction<SetRequired<Partial<IQuiz>, 'id'>>) {
			const quiz = quizzes[newQuiz.id];
			if (!quiz) return;
			quizzes[newQuiz.id] = {
				...quiz,
				...newQuiz,
			};

			sendMessageToBackground({
				command: BackgroundCommand.updateQuizInStore,
				quiz: quizzes[newQuiz.id]!,
			}).then(syncSidePanelStates);
		},
		remove(quizzes, { payload: ids }: PayloadAction<IQuiz['id'] | IQuiz['id'][]>) {
			const targetQuizIds = Array.isArray(ids) ? ids : [ids];
			const targetQuizUrls: IQuiz['url'][] = [];

			for (const targetQuizId of targetQuizIds) {
				if (!quizzes[targetQuizId]) continue;
				targetQuizUrls.push(quizzes[targetQuizId].url);
				delete quizzes[targetQuizId];
			}

			sendMessageToBackground<string>({
				command: BackgroundCommand.removeQuizzesFromStore,
				quizIds: targetQuizIds,
			}).then(() => {
				reloadSpeedGraderPages(targetQuizUrls);
				syncSidePanelStates();
			});
		},
		clear(quizzes) {
			const targetQuizUrls: IQuiz['url'][] = [];

			for (const id of Object.keys(quizzes)) {
				targetQuizUrls.push(quizzes[id]!.url);
				delete quizzes[id];
			}

			sendMessageToBackground({
				command: BackgroundCommand.removeQuizzesFromStore,
				quizIds: Object.keys(quizzes),
			}).then(() => {
				reloadSpeedGraderPages(targetQuizUrls);
				syncSidePanelStates();
			});
		},
		load(quizzes, { payload: newQuizzes }: PayloadAction<IQuiz[]>) {
			for (const id of Object.keys(quizzes)) {
				delete quizzes[id];
			}
			for (const newQuiz of newQuizzes) {
				quizzes[newQuiz.id] = newQuiz;
			}
		},
	},
});

export const {
	add: addQuiz,
	set: setQuiz,
	remove: removeQuizzes,
	clear: removeAllQuizzes,
	load: loadQuizzes,
} = quizzesSlice.actions;

export default quizzesSlice.reducer;
