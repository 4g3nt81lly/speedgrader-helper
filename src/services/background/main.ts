import { addMessageHandlers } from '#shared/message';
import AppSettingsSyncStorage from '#shared/storage/AppSettings';
import QuizFeedbackIDBStore from '#shared/storage/QuizFeedback';
import QuizzesIDBStore from '#shared/storage/Quizzes';
import TaskQueues from '#shared/utils/queues';
import Constants from './constants';
import configDev from './dev';
import { factoryReset } from './helpers';
import { loadQuiz } from './loader';

const taskQueues = new TaskQueues();

// Allows users to open side panel by clicking on the action toolbar icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
	console.error(
		'Failed to enable click action toolbar icon to toggle side panel:',
		error
	);
});

addMessageHandlers<'background'>({
	async 'app.updateSettings'({ partial }) {
		await taskQueues.run(Constants.APP_SETTINGS_ACTION_QUEUE_NAME, () =>
			AppSettingsSyncStorage.set(partial)
		);
		return true;
	},
	async 'app.factoryReset'() {
		await factoryReset();
		// FIXME: Also clear tasks currently in queue
		return true;
	},

	async 'quizzes.load'({ loader, payload }) {
		return loadQuiz(loader, payload);
	},
	'quizzes.getByID'({ id }) {
		return taskQueues.run(Constants.QUIZZES_ACTION_QUEUE_NAME, () =>
			QuizzesIDBStore.getByID(id)
		);
	},
	'quizzes.getByURL'({ url }) {
		return taskQueues.run(Constants.QUIZZES_ACTION_QUEUE_NAME, () =>
			QuizzesIDBStore.getByURL(url)
		);
	},
	async 'quizzes.add'({ quiz: newQuiz }) {
		await taskQueues.run(Constants.QUIZZES_ACTION_QUEUE_NAME, () =>
			QuizzesIDBStore.add(newQuiz)
		);
		return true;
	},
	async 'quizzes.set'({ quiz }) {
		await taskQueues.run(Constants.QUIZZES_ACTION_QUEUE_NAME, () =>
			QuizzesIDBStore.set(quiz)
		);
		return true;
	},
	async 'quizzes.remove'({ quizIds }) {
		if (quizIds.length > 0) {
			await taskQueues.run(Constants.QUIZZES_ACTION_QUEUE_NAME, () =>
				QuizzesIDBStore.remove(quizIds)
			);
		}
		return true;
	},
	async 'quizzes.clear'() {
		await taskQueues.run(Constants.QUIZZES_ACTION_QUEUE_NAME, () =>
			QuizzesIDBStore.clear()
		);
		return true;
	},
	'quizzes.getFeedback'({ quizId, submissionId }) {
		return taskQueues.run(Constants.QUIZZES_ACTION_QUEUE_NAME, () =>
			QuizFeedbackIDBStore.get(quizId, submissionId)
		);
	},
	async 'quizzes.updateFeedback'({ quizId, submissionId, feedback }) {
		await taskQueues.run(Constants.QUIZZES_ACTION_QUEUE_NAME, () =>
			QuizFeedbackIDBStore.updateFeedback(quizId, submissionId, feedback)
		);
		return true;
	},
	'quizzes.getLastGradedQuestion'({ quizId }) {
		return taskQueues.run(Constants.QUIZZES_ACTION_QUEUE_NAME, () =>
			QuizzesIDBStore.getLastGradedQuestion(quizId)
		);
	},
	async 'quizzes.updateLastGradedQuestion'({ quizId, questionId }) {
		await taskQueues.run(Constants.QUIZZES_ACTION_QUEUE_NAME, () =>
			QuizzesIDBStore.setLastGradedQuestion(quizId, questionId)
		);
		return true;
	},
});

if (import.meta.env.DEV) {
	configDev();
}

console.log('Background service worker loaded');
