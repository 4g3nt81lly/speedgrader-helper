import Constants from '#shared/constants';
import { addCommandHandler, BackgroundCommand } from '#shared/message';
import { TaskQueue } from '#shared/queues';
import QuizFeedbackLocalStore from '#shared/stores/QuizFeedbackLocalStore';
import QuizLocalStore from '#shared/stores/QuizLocalStore';
import configDev from './dev';

export const quizActionQueue = new TaskQueue(Constants.QUIZ_ACTION_QUEUE_NAME);

// Allows users to open side panel by clicking on the action toolbar icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
	console.error(
		'Failed to enable click action toolbar icon to toggle side panel:',
		error
	);
});

addCommandHandler({
	async [BackgroundCommand.addQuizToStore]({ quiz: newQuiz }) {
		await quizActionQueue.run(() => QuizLocalStore.addQuiz(newQuiz));
		return true;
	},
	async [BackgroundCommand.updateQuizInStore]({ quiz: newQuiz }) {
		await quizActionQueue.run(() => QuizLocalStore.setQuiz(newQuiz));
		return true;
	},
	async [BackgroundCommand.removeQuizzesFromStore]({ quizId, quizIds }) {
		const targetQuizIds = quizIds ?? [quizId];
		await quizActionQueue.run(() => QuizLocalStore.removeQuizzes(targetQuizIds));
		return true;
	},

	async [BackgroundCommand.updateQuestionFeedbackInStore]({
		quizId,
		submissionId,
		question,
	}) {
		await quizActionQueue.run(() =>
			question.feedback
				? QuizFeedbackLocalStore.setQuestionFeedback(
						quizId,
						submissionId,
						question.feedback
					)
				: QuizFeedbackLocalStore.removeQuestionFeedback(quizId, submissionId, question.id)
		);
		return true;
	},
	async [BackgroundCommand.updateQuizLastGradedQuestion]({ quizId, questionId }) {
		await quizActionQueue.run(() =>
			QuizLocalStore.setQuizLastGradedQuestion(quizId, questionId)
		);
		return true;
	},
});

if (import.meta.env.DEV) {
	configDev();
}

console.log('Background service worker loaded');
