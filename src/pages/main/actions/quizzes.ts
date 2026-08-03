import Quiz, { type IQuiz } from '#models/Quiz';
import QuizzesIDBStore from '#shared/storage/Quizzes';
import type { Nullable, SetOptional } from '#shared/types/utils';
import StoreActions from '#shared/utils/browser/StoreActions';

export default class QuizzesActions extends StoreActions<{
	quizzes: Record<IQuiz['id'], IQuiz>;
}> {
	private get quizzes() {
		return this.state.quizzes;
	}

	async load() {
		const quizzes = await QuizzesIDBStore.getAll();
		this.store.setState({
			quizzes: Object.fromEntries(quizzes.map((quiz) => [quiz.id, quiz])),
		});
	}

	put(quiz: SetOptional<IQuiz, 'id'>) {
		const newQuiz = Quiz.create(quiz);
		this.store.setState({
			quizzes: { ...this.quizzes, [newQuiz.id]: newQuiz },
		});
		return newQuiz;
	}

	remove(...ids: IQuiz['id'][]): Nullable<IQuiz[]> {
		if (ids.length === 0) return null;

		const removed: IQuiz[] = [];
		const quizzes = { ...this.quizzes };
		for (const id of ids) {
			if (!quizzes[id]) continue;
			removed.push(quizzes[id]);
			delete quizzes[id];
		}
		if (removed.length === 0) return null;

		this.store.setState({ quizzes });
		return removed;
	}

	clear() {
		this.store.setState({ quizzes: {} });
	}
}
