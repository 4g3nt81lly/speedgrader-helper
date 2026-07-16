import type { IQuiz } from '#models/Quiz';
import Constants from '#shared/constants';
import { sendMessageToBackground } from '#shared/message';
import QuizLocalStore from '#shared/stores/QuizLocalStore';
import type { QuizLoaderPayloadMap, QuizLoaderType } from '#shared/types/loader';
import { BackgroundCommand, type CommandMessagePayload } from '#shared/types/message';
import type { Nullable } from '#shared/types/utils';
import {
	useMainSelector,
	type MainPageDispatch,
} from '#sidepanel/pages/main/stores/main.store';
import { addQuiz } from '#sidepanel/pages/main/stores/quizzes.slice';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

const defaultQuizLoaderOptions: Record<
	QuizLoaderType,
	Nullable<Pick<QuizLoaderPayloadMap[QuizLoaderType], 'payload'>>
> = {
	oldSG: {},
	newSG: {},
	canvasAPI: null,
};

type CreateQuizState =
	| {
			newQuiz: null;
			isLoading: false;
			isOverwrite: false;
			errorMessage: Nullable<string>;
	  }
	| {
			newQuiz: null;
			isLoading: true;
			isOverwrite: false;
			errorMessage: null;
	  }
	| {
			newQuiz: IQuiz;
			isLoading: false;
			isOverwrite: boolean;
			errorMessage: null;
	  };

export default function useCreateQuiz(dismiss: () => void) {
	const dispatch = useDispatch<MainPageDispatch>();
	const appSettings = useMainSelector('settings');

	const [quizLoader, setQuizLoader] = useState(appSettings.defaultQuizLoader);
	const [quizLoaderOptions, setQuizLoaderOptions] = useState(
		defaultQuizLoaderOptions[appSettings.defaultQuizLoader]
	);

	const [state, setState] = useState<CreateQuizState>({
		newQuiz: null,
		isLoading: false,
		isOverwrite: false,
		errorMessage: null,
	});

	function handleSetQuizLoader(quizLoader: QuizLoaderType) {
		if (state.newQuiz) return;
		setQuizLoader(quizLoader);
		setQuizLoaderOptions(defaultQuizLoaderOptions[quizLoader]);
	}

	function handleSetQuizLoaderOptions<Type extends QuizLoaderType>(
		options: Nullable<Pick<QuizLoaderPayloadMap[Type], 'payload'>>
	) {
		setQuizLoaderOptions(options);
	}

	async function loadQuiz() {
		if (quizLoaderOptions === null) return;
		setState({ newQuiz: null, isLoading: true, isOverwrite: false, errorMessage: null });
		try {
			var quiz = await sendMessageToBackground<IQuiz, BackgroundCommand.loadQuiz>(
				{
					command: BackgroundCommand.loadQuiz,
					...(<CommandMessagePayload[BackgroundCommand.loadQuiz]>{
						loader: quizLoader,
						payload: quizLoaderOptions.payload,
					}),
				},
				{ timeout: { milliseconds: 5 * Constants.SECOND_MS }, throwOnNoReceiver: true }
			);
			var oldQuiz = await QuizLocalStore.getQuizByUrl(quiz.url);
		} catch (error) {
			return setState({
				newQuiz: null,
				isLoading: false,
				isOverwrite: false,
				errorMessage:
					error instanceof Error ? error.message : 'An error occurred while loading quiz',
			});
		}
		setState({
			newQuiz: quiz,
			isLoading: false,
			isOverwrite: oldQuiz !== null,
			errorMessage: null,
		});
	}

	async function confirmQuiz() {
		if (!state.newQuiz) return;
		if (
			state.isOverwrite &&
			!confirm(
				'Warning: A quiz with this URL already exists, this will replace it and consequently remove all rubrics and cached feedbacks. This cannot be undone!'
			)
		)
			return;
		dismiss();
		dispatch(addQuiz(state.newQuiz));
	}

	function reset() {
		setState({ newQuiz: null, isLoading: false, isOverwrite: false, errorMessage: null });
	}

	return {
		state,
		quizLoader,
		quizLoaderOptions,

		setQuizLoader: handleSetQuizLoader,
		setQuizLoaderOptions: handleSetQuizLoaderOptions,
		loadQuiz,
		confirmQuiz,
		reset,
	};
}
