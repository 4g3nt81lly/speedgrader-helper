import type { IQuiz } from '#models/Quiz';
import actions from '#pages/main/actions';
import { mainPageState } from '#pages/main/stores';
import { sendMessageToBackground } from '#shared/message';
import QuizzesIDBStore from '#shared/storage/Quizzes';
import type {
	QuizLoaderPayload,
	QuizLoaderPayloadMap,
	QuizLoaderType,
} from '#shared/types/loader';
import type { Nullable } from '#shared/types/utils';
import Decimal from 'decimal.js';
import { useMemo, useState } from 'react';

export default function useCreateQuiz(dismiss: () => void) {
	const appSettings = mainPageState.useStore('settings');

	const [loader, setLoader] = useState<LoaderOptions[QuizLoaderType]>(
		defaultLoaderOptions[appSettings.defaultQuizLoader]
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

	async function load() {
		if (!loader.payload) return;
		setState({ newQuiz: null, isLoading: true, isOverwrite: false, errorMessage: null });
		try {
			var quiz = await sendMessageToBackground(
				{
					name: 'quizzes.load',
					...(<QuizLoaderPayloadMap[QuizLoaderType]>{
						loader: loader.type,
						payload: loader.payload,
					}),
				},
				{ timeout: { seconds: 5 }, throwOnNoReceiver: true }
			);
			var oldQuiz = await QuizzesIDBStore.getByURL(quiz.url);
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

	async function confirmCreate() {
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
		actions.addQuiz(state.newQuiz);
		actions.selection.selectQuiz(state.newQuiz.id);
	}

	function reset() {
		setState({ newQuiz: null, isLoading: false, isOverwrite: false, errorMessage: null });
	}

	return {
		state,
		totalPoints,
		quizLoader: loader,

		setQuizLoader: setLoader,
		loadQuiz: load,
		confirmCreate,
		reset,
	};
}

type LoaderOptions = {
	[Type in QuizLoaderType]: {
		type: Type;
		payload: Nullable<QuizLoaderPayload[Type]>;
	};
};

const defaultLoaderOptions: LoaderOptions = {
	oldSG: {
		type: 'oldSG',
		payload: null,
	},
	newSG: {
		type: 'newSG',
		payload: null,
	},
	canvasAPI: {
		type: 'canvasAPI',
		payload: null,
	},
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
