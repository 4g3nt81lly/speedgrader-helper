import type { IQuiz } from '#models/Quiz';
import Quiz from '#models/Quiz';
import Constants from '#pages/constants';
import { queued, reloadSpeedGraderPages, syncPages, toastOnError } from '#pages/helpers';
import { mainPageState, type MainPageState, type MainTab } from '#pages/main/stores';
import SettingsActions from '#pages/settings/actions/settings';
import { sendMessageToBackground } from '#shared/message';
import type { Nullable, SetOptional } from '#shared/types/utils';
import StoreActions from '#shared/utils/browser/StoreActions';
import QuizzesActions from './quizzes';
import SelectionActions from './selection';

class MainPageActions extends StoreActions<MainPageState> {
	private readonly quizzes = new QuizzesActions(this.store);
	private readonly selection = new SelectionActions(this.store);
	readonly settings = new SettingsActions(this.store);

	@queued(Constants.QUIZZES_QUEUE_NAME)
	@toastOnError('Unable to load quizzes, please reload and try again!')
	async loadQuizzes() {
		await this.quizzes.load();
		this.deselectQuizIfInvalid();
	}

	@queued(Constants.QUIZZES_QUEUE_NAME)
	@toastOnError('Unable to add quiz, please try again!')
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

	@queued(Constants.QUIZZES_QUEUE_NAME)
	@toastOnError('Unable to update quiz, please try again!')
	async updateQuiz(quiz: IQuiz, reload: boolean = false) {
		await sendMessageToBackground({ name: 'quizzes.set', quiz });

		this.quizzes.put(quiz);

		if (reload) {
			reloadSpeedGraderPages(quiz.url);
		}
		syncPages();
	}

	@queued(Constants.QUIZZES_QUEUE_NAME)
	@toastOnError('Unable to remove quiz(zes), please try again!')
	async removeQuizzes(...ids: IQuiz['id'][]) {
		if (ids.length === 0) return;
		await sendMessageToBackground({ name: 'quizzes.remove', quizIds: ids });

		const removed = this.quizzes.remove(...ids);
		if (!removed) return;

		this.deselectQuizIfInvalid();
		reloadSpeedGraderPages(...removed.map((quiz) => quiz.url));
		syncPages();
	}

	@queued(Constants.QUIZZES_QUEUE_NAME)
	@toastOnError('Unable to clear all quizzes, please try again!')
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
			this.selectQuiz(null);
		}
	}

	@toastOnError('Unable to load selection state.')
	loadSelection() {
		return this.selection.load();
	}

	@toastOnError()
	selectTab(tab: MainTab) {
		return this.selection.selectMainTab(tab);
	}

	@toastOnError()
	selectQuiz(quizId: Nullable<IQuiz['id']>) {
		return this.selection.selectQuiz(quizId);
	}
}

export default mainPageState.getActions(MainPageActions);
