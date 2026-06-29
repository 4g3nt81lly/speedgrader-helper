import type { MainPageDispatch } from '@pages/main/stores/main.store';
import { addQuiz } from '@pages/main/stores/quizzes.slice';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { IQuiz } from '~/models/Quiz';
import type { QuizLoaderType } from '~/services/content/QuizLoader';
import Constants from '~/shared/constants';
import { ContentCommand, sendMessageToTab } from '~/shared/message';
import QuizLocalStore from '~/shared/stores/QuizLocalStore';
import type { Nullable } from '~/types/utils';

export default function useCreateQuiz(dismiss: () => void) {
	const dispatch = useDispatch<MainPageDispatch>();

	const [quizLoader, setQuizLoader] = useState<QuizLoaderType>('oldSG');
	const [newQuiz, setNewQuiz] = useState<Nullable<IQuiz>>(null);

	const [isLoading, setIsLoading] = useState(true);
	const [isOverwrite, setIsOverwrite] = useState(false);
	const [errorMessage, setErrorMessage] = useState<Nullable<string>>(null);

	async function loadQuiz(quizLoader: QuizLoaderType) {
		if (newQuiz) setNewQuiz(null);
		if (!isLoading) setIsLoading(true);
		if (isOverwrite) setIsOverwrite(false);
		if (errorMessage !== null) setErrorMessage(null);

		try {
			var quiz = await sendMessageToTab<IQuiz, ContentCommand.loadQuiz>(
				{ command: ContentCommand.loadQuiz, loader: quizLoader },
				{ timeout: { milliseconds: 5 * Constants.SECOND_MS } }
			);
			var oldQuiz = await QuizLocalStore.getQuizByUrl(quiz.url);
		} catch (error) {
			return setErrorMessage(
				(<Error>error)?.message ?? 'An error occurred while loading quiz'
			);
		} finally {
			setIsLoading(false);
		}
		setNewQuiz(quiz);
		if (oldQuiz) setIsOverwrite(true);
	}

	return {
		newQuiz,
		quizLoader,
		isLoading,
		isOverwrite,
		errorMessage,

		setQuizLoader(quizLoader: QuizLoaderType) {
			setQuizLoader(quizLoader);
			loadQuiz(quizLoader);
		},

		loadQuiz() {
			loadQuiz(quizLoader);
		},

		async confirmQuiz() {
			if (!newQuiz) return;
			if (
				isOverwrite &&
				!confirm(
					'Warning: A quiz with this URL already exists, this will replace it and consequently remove all cached feedbacks. This cannot be undone!'
				)
			)
				return;
			dismiss();
			dispatch(addQuiz(newQuiz));
		},
	};
}
