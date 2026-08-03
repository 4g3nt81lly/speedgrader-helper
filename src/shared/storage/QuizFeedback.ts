import type { IQuizSubmissionFeedback, QuestionFeedback } from '#models/Feedback';
import type { IQuestion } from '#models/Question';
import type { IQuiz } from '#models/Quiz';
import type { Nullable } from '#shared/types/utils';
import type { IDBPDatabase } from 'idb';
import { mainIDBPromise, mainIDBTransaction } from '.';
import type { MainIDBSchema, MainIDBTransaction } from './types';

export default class QuizFeedbackIDBStore {
	static migrate(
		db: IDBPDatabase<MainIDBSchema>,
		oldVersion: number,
		newVersion: Nullable<number>
	) {
		db.createObjectStore('quizSubmissionFeedback');
	}

	private static getKey(quizId: IQuiz['id'], submissionId: string) {
		return `${quizId}:${submissionId}` as const;
	}

	public static async get(
		quizId: IQuiz['id'],
		submissionId: string
	): Promise<Nullable<IQuizSubmissionFeedback>> {
		return (await mainIDBPromise)
			.get('quizSubmissionFeedback', this.getKey(quizId, submissionId))
			.then((feedback) => feedback ?? null)
			.catch((error: Error) => {
				throw new Error(
					`Failed to fetch quiz submission feedback for quiz ID "${quizId}" and submission ID "${submissionId}" from persistent store: ${error.message}`
				);
			});
	}

	public static async set(feedback: IQuizSubmissionFeedback) {
		await (
			await mainIDBPromise
		)
			.put(
				'quizSubmissionFeedback',
				feedback,
				this.getKey(feedback.quizId, feedback.submissionId)
			)
			.catch((error: Error) => {
				throw new Error(
					`Failed to update quiz submission feedback for quiz ID "${feedback.quizId}" and submission ID "${feedback.submissionId}" in persistent store: ${error.message}`
				);
			});
	}

	public static async updateFeedback(
		quizId: IQuiz['id'],
		submissionId: string,
		partialFeedback: Record<IQuestion['id'], Nullable<QuestionFeedback>>
	) {
		const key = this.getKey(quizId, submissionId);
		await mainIDBTransaction(
			['quizSubmissionFeedback'],
			async (tx) => {
				const store = tx.objectStore('quizSubmissionFeedback');
				const quizFeedback = (await store.get(key)) ?? {
					quizId,
					submissionId,
					questions: {},
				};
				for (const [questionId, feedback] of Object.entries(partialFeedback)) {
					if (feedback) {
						quizFeedback.questions[questionId] = feedback;
					} else {
						delete quizFeedback.questions[questionId];
					}
				}
				if (Object.keys(quizFeedback.questions).length > 0) {
					await store.put(quizFeedback, key);
				} else {
					await store.delete(key);
				}
			},
			'readwrite'
		).catch((error: Error) => {
			throw new Error(
				`Failed to update feedback for quiz ID "${quizId}" and submission ID "${submissionId}": ${error.message}`
			);
		});
	}

	public static async remove(quizId: IQuiz['id'], submissionId: string) {
		await (
			await mainIDBPromise
		)
			.delete('quizSubmissionFeedback', this.getKey(quizId, submissionId))
			.catch((error: Error) => {
				throw new Error(
					`Failed to remove submission feedback for quiz ID "${quizId}" and submission ID "${submissionId}" from persistent store: ${error.message}`
				);
			});
	}

	public static clear(quizId: IQuiz['id']): Promise<void>;
	public static clear(
		quizId: IQuiz['id'],
		transaction: MainIDBTransaction<'readwrite'>
	): Promise<void>;
	public static async clear(
		quizId: IQuiz['id'],
		transaction?: MainIDBTransaction<'readwrite'>
	) {
		if (!transaction) {
			return mainIDBTransaction(
				['quizSubmissionFeedback'],
				(tx) => this.clear(quizId, tx),
				'readwrite'
			).catch((error: Error) => {
				throw new Error(
					`Failed to clear all submission feedback for quiz ID "${quizId}" from persistent store: ${error.message}`
				);
			});
		}
		const store = transaction.objectStore('quizSubmissionFeedback');
		const keyPrefix = this.getKey(quizId, '');
		const keys = (await store.getAllKeys()).filter((key) => key.startsWith(keyPrefix));
		await Promise.all(keys.map((key) => store.delete(key)));
	}

	public static clearAll(): Promise<void>;
	public static clearAll(transaction?: MainIDBTransaction<'readwrite'>): Promise<void>;
	public static clearAll(transaction?: MainIDBTransaction<'readwrite'>) {
		if (!transaction) {
			return mainIDBTransaction(
				['quizSubmissionFeedback'],
				(tx) => this.clearAll(tx),
				'readwrite'
			).catch((error: Error) => {
				throw new Error(
					`Failed to clear all quiz submission feedback from persistent store: ${error.message}`
				);
			});
		}
		return transaction.objectStore('quizSubmissionFeedback').clear();
	}
}
