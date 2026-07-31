import type { IQuiz } from '#models/Quiz';
import { useMainAppSettings } from '#pages/main/stores/main.store';
import { addQuiz } from '#pages/main/stores/quizzes.actions';
import { selectQuiz } from '#pages/main/stores/selection.actions';
import Constants from '#shared/constants';
import { sendMessageToBackground } from '#shared/message';
import QuizLocalStore from '#shared/stores/QuizLocalStore';
import type { QuizLoaderPayloadMap, QuizLoaderType } from '#shared/types/loader';
import { BackgroundCommand, type CommandMessagePayload } from '#shared/types/message';
import type { Nullable } from '#shared/types/utils';
import Decimal from 'decimal.js';
import { useMemo, useState } from 'react';

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
	const appSettings = useMainAppSettings();

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

	const totalPoints = useMemo(() => {
		const basePoints = Decimal(0);
		if (!state.newQuiz) {
			return basePoints;
		}
		return state.newQuiz.questions.reduce(
			(total, question) => total.add(question.points),
			basePoints
		);
	}, [state.newQuiz]);

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
		) {
			return;
		}
		dismiss();
		addQuiz(state.newQuiz);
		selectQuiz(state.newQuiz.id);
	}

	function reset() {
		setState({ newQuiz: null, isLoading: false, isOverwrite: false, errorMessage: null });
	}

	return {
		state,
		totalPoints,
		quizLoader,
		quizLoaderOptions,

		setQuizLoader: handleSetQuizLoader,
		setQuizLoaderOptions: handleSetQuizLoaderOptions,
		loadQuiz,
		confirmQuiz,
		reset,
	};
}
