import Quiz, { type IQuiz } from '#models/Quiz';
import { sendMessageToBackground } from '#shared/message';
import QuizLocalStore from '#shared/stores/QuizLocalStore';
import { BackgroundCommand } from '#shared/types/message';
import { reloadSpeedGraderPages, syncSidePanelStates } from './helpers';
import { useMainPageStore } from './main.store';
import { selectQuiz } from './selection.actions';

function getQuizzes() {
	return useMainPageStore.getState().quizzes;
}

export function addQuiz(quiz: Parameters<typeof Quiz.create>[0]) {
	const quizzes = { ...getQuizzes() };
	const newQuiz = Quiz.create(quiz);
	const oldQuiz = Object.values(quizzes).find((quiz) => quiz.url === newQuiz.url);
	if (oldQuiz) {
		delete quizzes[oldQuiz.id];
	}
	quizzes[newQuiz.id] = newQuiz;
	useMainPageStore.setState({ quizzes });

	return addQuizToStore(newQuiz);
}

export function updateQuiz(
	quiz: SetRequired<Partial<IQuiz>, 'id'>,
	reload: boolean = false
) {
	const quizzes = { ...getQuizzes() };
	const oldQuiz = quizzes[quiz.id];
	if (!oldQuiz) return;

	const newQuiz = { ...oldQuiz, ...quiz };
	quizzes[quiz.id] = newQuiz;
	useMainPageStore.setState({ quizzes });

	return updateQuizInStore(newQuiz, reload);
}

export function removeQuizzes(quizIds: IQuiz['id'] | IQuiz['id'][]) {
	const quizzes = { ...getQuizzes() };

	const targetQuizIds = Array.isArray(quizIds) ? quizIds : [quizIds];
	const targetQuizzes: IQuiz[] = [];
	for (const targetQuizId of targetQuizIds) {
		if (!quizzes[targetQuizId]) {
			continue;
		}
		targetQuizzes.push(quizzes[targetQuizId]);
		delete quizzes[targetQuizId];
	}
	useMainPageStore.setState({ quizzes });

	return removeQuizzesFromStore(targetQuizzes);
}

export function clearQuizzes() {
	const { quizzes, selection } = useMainPageStore.getState();
	const targetQuizzes = Object.values(quizzes);

	useMainPageStore.setState({
		quizzes: {},
		selection: { ...selection, quiz: null },
	});

	return removeQuizzesFromStore(targetQuizzes);
}

export async function loadQuizzesFromLocalStore() {
	try {
		var quizzes = await QuizLocalStore.getQuizzes();
	} catch (error) {
		console.error('Failed to load quizzes from local storage:', error);
		return alert('Failed to load quizzes from local storage');
	}
	const newQuizzes = Object.fromEntries(quizzes.map((quiz) => [quiz.id, quiz]));

	const selectedQuizId = useMainPageStore.getState().selection.quiz;
	if (selectedQuizId !== null && !newQuizzes[selectedQuizId]) {
		selectQuiz(null);
	}

	useMainPageStore.setState({ quizzes: newQuizzes });
}

async function addQuizToStore(quiz: IQuiz) {
	await sendMessageToBackground({ command: BackgroundCommand.addQuizToStore, quiz });
	reloadSpeedGraderPages(quiz.url);
	syncSidePanelStates();
}

async function updateQuizInStore(quiz: IQuiz, reload: boolean = false) {
	await sendMessageToBackground({ command: BackgroundCommand.updateQuizInStore, quiz });
	if (reload) {
		reloadSpeedGraderPages(quiz.url);
	}
	syncSidePanelStates();
}

async function removeQuizzesFromStore(quizzes: Pick<IQuiz, 'id' | 'url'>[]) {
	await sendMessageToBackground({
		command: BackgroundCommand.removeQuizzesFromStore,
		quizIds: quizzes.map((quiz) => quiz.id),
	});
	reloadSpeedGraderPages(quizzes.map((quiz) => quiz.url));
	syncSidePanelStates();
}
