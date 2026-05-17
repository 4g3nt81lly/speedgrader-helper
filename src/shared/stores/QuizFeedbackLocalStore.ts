import type { ISubmissionFeedback, QuestionFeedback } from '~/models/Feedback';
import type { IQuestion } from '~/models/Question';
import type { IQuiz } from '~/models/Quiz';
import type {
	ILocalStore,
	StoreQuizFeedbackKey,
	StoreQuizSubmissionFeedbackKey,
} from '~/types/store';
import type { Nullable } from '~/types/utils';
import { getLocalStore } from './utils';

export default class QuizFeedbackLocalStore {
	private static makeStoreQuizFeedbackKey(quizId: IQuiz['id']): StoreQuizFeedbackKey {
		return `quizFeedback:${quizId}`;
	}

	private static makeStoreQuizSubmissionFeedbackKey(
		quizId: IQuiz['id'],
		submissionId: string
	): StoreQuizSubmissionFeedbackKey {
		return `quizSubmissionFeedback:${quizId}:${submissionId}`;
	}

	private static async getStoreQuizSubmissionFeedbackKeys(
		quizId: IQuiz['id']
	): Promise<StoreQuizSubmissionFeedbackKey[]> {
		const keys = await getLocalStore
			.withType<ILocalStore>()(this.makeStoreQuizFeedbackKey(quizId))
			.catch((error) => {
				throw new Error(
					`Failed to load quiz submission feedback keys from local storage: ${error.message}`
				);
			});
		if (!keys) {
			return [];
		}
		return keys;
	}

	public static async getStoreQuizSubmissionFeedback(
		quizId: IQuiz['id'],
		submissionId: string
	): Promise<Nullable<ISubmissionFeedback>> {
		const submissionFeedbackKey = this.makeStoreQuizSubmissionFeedbackKey(
			quizId,
			submissionId
		);
		return getLocalStore
			.withType<ILocalStore>()(submissionFeedbackKey)
			.then((submissionFeedback) => submissionFeedback ?? null)
			.catch((error) => {
				throw new Error(
					`Failed to load quiz submission feedback for submission ID "${submissionId}" from local storage: ${error.message}`
				);
			});
	}

	public static async setSubmissionFeedback(
		quizId: IQuiz['id'],
		submissionFeedback: ISubmissionFeedback
	) {
		const feedbackKey = this.makeStoreQuizFeedbackKey(quizId);
		const submissionFeedbackKey = this.makeStoreQuizSubmissionFeedbackKey(
			quizId,
			submissionFeedback.submissionId
		);
		const newSubmissionFeedbackKeys =
			await this.getStoreQuizSubmissionFeedbackKeys(quizId);
		if (!newSubmissionFeedbackKeys.includes(submissionFeedbackKey)) {
			newSubmissionFeedbackKeys.push(submissionFeedbackKey);
		}

		return chrome.storage.local
			.set({
				[feedbackKey]: newSubmissionFeedbackKeys,
				[submissionFeedbackKey]: submissionFeedback,
			})
			.catch((error) => {
				throw new Error(
					`Failed to add quiz submission feedback for ID "${quizId}" to local storage: ${error.message}`
				);
			});
	}

	public static async clearAllFeedback(quizId: IQuiz['id']) {
		const feedbackKey = this.makeStoreQuizFeedbackKey(quizId);
		await getLocalStore
			.withType<ILocalStore>()(feedbackKey)
			.then(
				(submissionFeedbackKeys) =>
					submissionFeedbackKeys &&
					chrome.storage.local.remove([feedbackKey, ...submissionFeedbackKeys])
			)
			.catch((error) => {
				throw new Error(
					`Failed to clear all submission feedbacks for quiz "${quizId}" from local storage: ${error.message}`
				);
			});
	}

	public static async removeSubmissionFeedback(
		quizId: IQuiz['id'],
		submissionId: string
	) {
		const feedbackKey = this.makeStoreQuizFeedbackKey(quizId);
		const targetSubmissionFeedbackKey = this.makeStoreQuizSubmissionFeedbackKey(
			quizId,
			submissionId
		);
		const newSubmissionFeedbackKeys = (
			await this.getStoreQuizSubmissionFeedbackKeys(quizId)
		).filter(
			(submissionFeedbackKey) => submissionFeedbackKey !== targetSubmissionFeedbackKey
		);
		return chrome.storage.local
			.set({ [feedbackKey]: newSubmissionFeedbackKeys })
			.then(() => chrome.storage.local.remove(targetSubmissionFeedbackKey))
			.catch((error) => {
				throw new Error(
					`Failed to remove quiz "${quizId}" submission feedback for ID "${submissionId}" from local storage: ${error.message}`
				);
			});
	}

	public static async setQuestionFeedback(
		quizId: IQuiz['id'],
		submissionId: string,
		questionFeedback: QuestionFeedback
	) {
		let submissionFeedback: Nullable<ISubmissionFeedback> =
			await this.getStoreQuizSubmissionFeedback(quizId, submissionId);
		if (submissionFeedback) {
			submissionFeedback.questions[questionFeedback.questionId] = questionFeedback;
		} else {
			submissionFeedback = {
				submissionId,
				questions: {
					[questionFeedback.questionId]: questionFeedback,
				},
			};
		}
		return this.setSubmissionFeedback(quizId, submissionFeedback);
	}

	public static async removeQuestionFeedback(
		quizId: string,
		submissionId: string,
		questionId: IQuestion['id']
	) {
		const submissionFeedback: Nullable<ISubmissionFeedback> =
			await this.getStoreQuizSubmissionFeedback(quizId, submissionId);
		if (!submissionFeedback) return;

		delete submissionFeedback.questions[questionId];

		if (Object.keys(submissionFeedback.questions).length === 0) {
			return this.removeSubmissionFeedback(quizId, submissionId);
		}

		return this.setSubmissionFeedback(quizId, submissionFeedback);
	}
}
