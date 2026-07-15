import Constants from '#shared/constants';
import { addCommandHandler, BackgroundCommand } from '#shared/message';
import TaskQueues from '#shared/queues';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';
import QuizFeedbackLocalStore from '#shared/stores/QuizFeedbackLocalStore';
import QuizLocalStore from '#shared/stores/QuizLocalStore';
import configDev from './dev';
import { quizLoadHandler } from './loader';

const taskQueues = new TaskQueues();

// Allows users to open side panel by clicking on the action toolbar icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
	console.error(
		'Failed to enable click action toolbar icon to toggle side panel:',
		error
	);
});

addCommandHandler({
	async [BackgroundCommand.updateAppSettings]({ partialSettings }) {
		await taskQueues.run(Constants.APP_SETTINGS_ACTION_QUEUE_NAME, () =>
			AppSettingsLocalStore.set(partialSettings)
		);
		return true;
	},

	async [BackgroundCommand.loadQuiz]({ loader, payload }) {
		const quizLoader =
			loader ?? (await AppSettingsLocalStore.getOrDefault('defaultQuizLoader'));
		return quizLoadHandler[quizLoader](payload as unknown as any);
	},

	async [BackgroundCommand.addQuizToStore]({ quiz: newQuiz }) {
		await taskQueues.run(Constants.QUIZ_ACTION_QUEUE_NAME, () =>
			QuizLocalStore.addQuiz(newQuiz)
		);
		return true;
	},
	async [BackgroundCommand.updateQuizInStore]({ quiz: newQuiz }) {
		await taskQueues.run(Constants.QUIZ_ACTION_QUEUE_NAME, () =>
			QuizLocalStore.setQuiz(newQuiz)
		);
		return true;
	},
	async [BackgroundCommand.removeQuizzesFromStore]({ quizId, quizIds }) {
		const targetQuizIds = quizIds ?? [quizId];
		await taskQueues.run(Constants.QUIZ_ACTION_QUEUE_NAME, () =>
			QuizLocalStore.removeQuizzes(targetQuizIds)
		);
		return true;
	},

	async [BackgroundCommand.updateQuestionFeedbackInStore]({
		quizId,
		submissionId,
		question,
	}) {
		await taskQueues.run(Constants.QUIZ_ACTION_QUEUE_NAME, () =>
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
		await taskQueues.run(Constants.QUIZ_ACTION_QUEUE_NAME, () =>
			QuizLocalStore.setQuizLastGradedQuestion(quizId, questionId)
		);
		return true;
	},
});

if (import.meta.env.DEV) {
	configDev();
}

console.log('Background service worker loaded');
