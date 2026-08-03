import type { IQuestion } from '#models/Question';
import type { IQuiz } from '#models/Quiz';
import type { Nullable } from '#shared/types/utils';
import type { IDBPDatabase } from 'idb';
import { mainIDBPromise, mainIDBTransaction } from '.';
import QuizFeedbackIDBStore from './QuizFeedback';
import type { MainIDBSchema, MainIDBTransaction } from './types';

export default class QuizzesIDBStore {
	static migrate(
		db: IDBPDatabase<MainIDBSchema>,
		oldVersion: number,
		newVersion: Nullable<number>
	) {
		db.createObjectStore('quizzes', {
			keyPath: 'id',
		}).createIndex('by-url', 'url', { unique: true });

		db.createObjectStore('quizLastGradedQuestions');
	}

	public static async getAll() {
		return (await mainIDBPromise).getAll('quizzes').catch((error: Error) => {
			throw new Error(`Failed to fetch quizzes from persistent store: ${error.message}`);
		});
	}

	public static getByIDs(ids: IQuiz['id'][]) {
		return mainIDBTransaction(
			['quizzes'],
			async (tx) => {
				const quizzesStore = tx.objectStore('quizzes');
				const quizzes = await Promise.all(ids.map((id) => quizzesStore.get(id)));
				return <IQuiz[]>quizzes.filter(Boolean);
			},
			'readonly'
		).catch((error: Error) => {
			throw new Error(
				`Failed to fetch quizzes by IDs ${ids.join(', ')} from persistent store: ${error.message}`
			);
		});
	}

	public static async getByID(id: IQuiz['id']): Promise<Nullable<IQuiz>> {
		const [quiz] = await this.getByIDs([id]);
		return quiz ?? null;
	}

	public static async getByURL(url: IQuiz['url']): Promise<Nullable<IQuiz>> {
		try {
			const quiz = await (await mainIDBPromise).getFromIndex('quizzes', 'by-url', url);
			return quiz ?? null;
		} catch (error) {
			throw new Error(
				`Failed to fetch quiz with canonical URL "${url}" from persistent store: ${(<Error>error).message}`
			);
		}
	}

	public static async add(quiz: IQuiz) {
		await mainIDBTransaction(
			['quizzes'],
			async (tx) => {
				const quizzesStore = tx.objectStore('quizzes');
				const quizIdsByUrl = await quizzesStore.index('by-url').getAllKeys(quiz.url);
				if (quizIdsByUrl.length > 0) {
					await Promise.all(quizIdsByUrl.map((quizId) => quizzesStore.delete(quizId)));
				}
				await quizzesStore.add(quiz);
			},
			'readwrite'
		).catch((error: Error) => {
			throw new Error(`Failed to add quiz to persistent store: ${error.message}`);
		});
	}

	public static async set(quiz: IQuiz) {
		await (await mainIDBPromise).put('quizzes', quiz).catch((error: Error) => {
			throw new Error(
				`Failed to update quiz with ID "${quiz.id}" in persistent store: ${error.message}`
			);
		});
	}

	public static remove(id: IQuiz['id']): Promise<void>;
	public static remove(id: IQuiz['id'][]): Promise<void>;
	public static remove(id: IQuiz['id'] | IQuiz['id'][]) {
		const ids = Array.isArray(id) ? id : [id];
		return mainIDBTransaction(
			['quizzes', 'quizSubmissionFeedback'],
			async (tx) => {
				const quizzesStore = tx.objectStore('quizzes');
				await Promise.all(
					ids.flatMap((id) => [
						quizzesStore.delete(id),
						QuizFeedbackIDBStore.clear(id, tx),
					])
				);
			},
			'readwrite'
		).catch((error: Error) => {
			throw new Error(
				`Failed to remove quizzes by IDs ${ids.join(', ')} from persistent store: ${error.message}`
			);
		});
	}

	public static async clear() {
		return mainIDBTransaction(
			['quizzes', 'quizSubmissionFeedback', 'quizLastGradedQuestions'],
			async (tx) => {
				await Promise.all([
					tx.objectStore('quizzes').clear(),
					QuizFeedbackIDBStore.clearAll(tx),
					tx.objectStore('quizLastGradedQuestions').clear(),
				]);
			},
			'readwrite'
		).catch((error: Error) => {
			throw new Error(`Failed to clear quizzes from persistent store: ${error.message}`);
		});
	}

	public static async getLastGradedQuestion(
		quizId: IQuiz['id']
	): Promise<Nullable<IQuestion['id']>> {
		return (await mainIDBPromise)
			.get('quizLastGradedQuestions', quizId)
			.then((questionId) => questionId ?? null)
			.catch((error: Error) => {
				throw new Error(
					`Failed to fetch last-graded question ID for quiz ID "${quizId}" from persistent store: ${error.message}`
				);
			});
	}

	public static setLastGradedQuestion(
		quizId: IQuiz['id'],
		questionId: Nullable<IQuestion['id']>
	): Promise<void>;
	public static setLastGradedQuestion(
		quizId: IQuiz['id'],
		questionId: Nullable<IQuestion['id']>,
		transaction: MainIDBTransaction<'readwrite'>
	): Promise<void>;
	public static async setLastGradedQuestion(
		quizId: IQuiz['id'],
		questionId: Nullable<IQuestion['id']>,
		transaction?: MainIDBTransaction<'readwrite'>
	) {
		if (!transaction) {
			return mainIDBTransaction(
				['quizLastGradedQuestions'],
				(tx) => this.setLastGradedQuestion(quizId, questionId, tx),
				'readwrite'
			).catch((error: Error) => {
				throw new Error(
					`Failed to update last-graded question ID "${questionId}" for quiz ID "${quizId}" in persistent store: ${error.message}`
				);
			});
		}
		return questionId === null
			? (await mainIDBPromise).delete('quizLastGradedQuestions', quizId)
			: (await mainIDBPromise).put('quizLastGradedQuestions', questionId, quizId);
	}
}
