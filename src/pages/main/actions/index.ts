import type { IQuiz } from '#models/Quiz';
import Quiz from '#models/Quiz';
import { reloadSpeedGraderPages, syncPages } from '#pages/helpers';
import { mainPageState, type MainPageState } from '#pages/main/stores';
import SettingsActions from '#pages/settings/actions/settings';
import { sendMessageToBackground } from '#shared/message';
import type { SetOptional } from '#shared/types/utils';
import StoreActions from '#shared/utils/browser/StoreActions';
import QuizzesActions from './quizzes';
import SelectionActions from './selection';

class MainPageActions extends StoreActions<MainPageState> {
	private readonly quizzes = new QuizzesActions(this.store);
	readonly selection = new SelectionActions(this.store);
	readonly settings = new SettingsActions(this.store);

	async loadQuizzes() {
		try {
			await this.quizzes.load();
		} catch (error) {
			console.error('Failed to load quizzes from local storage:', error);
			return alert('Failed to load quizzes from local storage');
		}
		this.deselectQuizIfInvalid();
	}

	async addQuiz(quiz: SetOptional<IQuiz, 'id'>) {
		const newQuiz = Quiz.create(quiz);
		await sendMessageToBackground({ name: 'quizzes.add', quiz: newQuiz });

		// Delete quizzes with the same URL
		const quizIdsByUrl = Object.values(this.state.quizzes).flatMap((oldQuiz) => {
			return oldQuiz.url === newQuiz.url ? oldQuiz.id : [];
		});
		this.quizzes.put(newQuiz);
		this.quizzes.remove(...quizIdsByUrl);

		reloadSpeedGraderPages(newQuiz.url);
		syncPages();
	}

	async updateQuiz(quiz: IQuiz, reload: boolean = false) {
		await sendMessageToBackground({ name: 'quizzes.set', quiz });

		this.quizzes.put(quiz);

		if (reload) {
			reloadSpeedGraderPages(quiz.url);
		}
		syncPages();
	}

	async removeQuizzes(...ids: IQuiz['id'][]) {
		if (ids.length === 0) return;
		await sendMessageToBackground({ name: 'quizzes.remove', quizIds: ids });

		const removed = this.quizzes.remove(...ids);
		if (!removed) return;

		this.deselectQuizIfInvalid();
		reloadSpeedGraderPages(...removed.map((quiz) => quiz.url));
		syncPages();
	}

	async clearQuizzes() {
		const quizzes = Object.values(this.state.quizzes);
		if (quizzes.length === 0) return;
		await sendMessageToBackground({ name: 'quizzes.clear' });

		this.quizzes.clear();

		this.deselectQuizIfInvalid();
		reloadSpeedGraderPages(...quizzes.map((quiz) => quiz.url));
		syncPages();
	}

	private deselectQuizIfInvalid() {
		const selectedQuizId = this.state.selection.quiz;
		if (selectedQuizId !== null && !this.state.quizzes[selectedQuizId]) {
			this.selection.selectQuiz(null);
		}
	}
}

export default mainPageState.getActions(MainPageActions);
