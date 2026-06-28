import { BackgroundCommand, type ICommandMessage } from '~/shared/message';
import QuizFeedbackLocalStore from '~/shared/stores/QuizFeedbackLocalStore';
import QuizLocalStore from '~/shared/stores/QuizLocalStore';
import { localStoreQueue } from './main';

type MessageHandlers = {
	[C in BackgroundCommand]?: (message: ICommandMessage<C>) => any;
};

const messageHandlers: MessageHandlers = {
	async [BackgroundCommand.addQuizToStore]({ quiz: newQuiz }) {
		await localStoreQueue.run(() => QuizLocalStore.addQuiz(newQuiz));
		return true;
	},
	async [BackgroundCommand.updateQuizInStore]({ quiz: newQuiz }) {
		await localStoreQueue.run(() => QuizLocalStore.setQuiz(newQuiz));
		return true;
	},
	async [BackgroundCommand.removeQuizzesFromStore]({ quizId, quizIds }) {
		const targetQuizIds = quizIds ?? [quizId];
		await localStoreQueue.run(() => QuizLocalStore.removeQuizzes(targetQuizIds));
		return true;
	},

	async [BackgroundCommand.updateQuestionFeedbackInStore]({
		quizId,
		submissionId,
		question,
	}) {
		await localStoreQueue.run(async () =>
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
		await localStoreQueue.run(async () =>
			QuizLocalStore.setQuizLastGradedQuestion(quizId, questionId)
		);
		return true;
	},
};

export default messageHandlers;
