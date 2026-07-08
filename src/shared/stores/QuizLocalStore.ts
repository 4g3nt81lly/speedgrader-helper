import type { IQuestion } from '#models/Question';
import type { IQuiz } from '#models/Quiz';
import Constants from '#shared/constants';
import type {
	ILocalStore,
	StoreQuizIdKey,
	StoreQuizIndex,
	StoreQuizLastGradedQuestionIdKey,
	StoreQuizUrlKey,
} from '#shared/types/store';
import type { Nullable, Optional } from '#shared/types/utils';
import QuizFeedbackLocalStore from './QuizFeedbackLocalStore';
import { getLocalStore } from './utils';

export default class QuizLocalStore {
	private static extractQuizId(storeQuizId: StoreQuizIdKey): IQuiz['id'] {
		return storeQuizId.substring(5);
	}

	private static makeStoreQuizIdKey(quizId: IQuiz['id']): StoreQuizIdKey {
		return `quiz:${quizId}`;
	}

	private static makeStoreQuizUrlKey(
		quiz: string | Pick<IQuiz, 'url' | 'assignmentId'>
	): StoreQuizUrlKey {
		return `quizUrl:${typeof quiz === 'string' ? quiz : quiz.url}`;
	}

	private static makeStoreQuizLastGradedQuestionIdKey(
		quizId: IQuiz['id']
	): StoreQuizLastGradedQuestionIdKey {
		return `quizLastGradedQuestion:${quizId}`;
	}

	private static async getStoreQuizIndexes(
		filter?: (quizIndex: StoreQuizIndex) => Optional<boolean>
	): Promise<StoreQuizIndex[]> {
		let indexes = await getLocalStore
			.withType<ILocalStore>()(Constants.STORE_QUIZZES_KEY)
			.catch((error) => {
				throw new Error(
					`Failed to load quiz indexes from local storage: ${error.message}`
				);
			});
		if (!indexes) {
			// Attempt to restore the missing field with empty array
			chrome.storage.local.set({ [Constants.STORE_QUIZZES_KEY]: [] });
			return [];
		}
		if (filter) {
			return indexes.filter((index) => filter(index));
		}
		return indexes;
	}

	public static async getQuizIds(): Promise<IQuiz['id'][]> {
		return this.getStoreQuizIndexes()
			.then((indexes) => indexes.map(({ idKey }) => this.extractQuizId(idKey)))
			.catch((error) => {
				throw new Error(`Failed to fetch quiz IDs from local storage: ${error.message}`);
			});
	}

	private static async getQuizzesByIdKeys(ids: StoreQuizIdKey[]): Promise<IQuiz[]> {
		return getLocalStore
			.withType<ILocalStore>()(ids)
			.then((quizzes) => ids.map((storeQuizIdKey) => quizzes[storeQuizIdKey]!))
			.catch((error) => {
				throw new Error(
					`Failed to load quizzes by IDs from local storage: ${error.message}`
				);
			});
	}

	public static async getQuizzesByIds(ids?: IQuiz['id'][]): Promise<IQuiz[]> {
		const quizIdKeys = ids?.map((id) => this.makeStoreQuizIdKey(id));
		const indexes = await this.getStoreQuizIndexes(({ idKey }) => {
			if (quizIdKeys) {
				return quizIdKeys.includes(idKey);
			}
			return true;
		});
		const storeQuizIdKeys = indexes.map((index) => index.idKey);
		return this.getQuizzesByIdKeys(storeQuizIdKeys);
	}

	public static async getQuizzes() {
		return this.getQuizzesByIds();
	}

	public static async getQuizById(quizId: IQuiz['id']): Promise<Nullable<IQuiz>> {
		const [quiz] = await this.getQuizzesByIds([quizId]);
		return quiz ?? null;
	}

	public static async getQuizByUrl(canonicalUrl: string) {
		try {
			const idKey = await getLocalStore.withType<ILocalStore>()(
				this.makeStoreQuizUrlKey(canonicalUrl)
			);
			if (!idKey) return null;
			return (await getLocalStore.withType<ILocalStore>()(idKey)) ?? null;
		} catch (error) {
			throw new Error(
				`Failed to load quiz with URL "${canonicalUrl}" from local storage: ${(error as Error).message}`
			);
		}
	}

	public static async getQuizLastGradedQuestionId(
		quizId: IQuiz['id']
	): Promise<Nullable<IQuestion['id']>> {
		const quizLastGradedQuestionIdKey = this.makeStoreQuizLastGradedQuestionIdKey(quizId);
		return getLocalStore
			.withType<ILocalStore>()(quizLastGradedQuestionIdKey)
			.then((lastGradedQuestionId) => lastGradedQuestionId ?? null)
			.catch((error) => {
				throw new Error(
					`Failed to load last-graded question ID for quiz "${quizId}" from local storage: ${error.message}`
				);
			});
	}

	public static async setQuiz(quiz: IQuiz) {
		const storageQuizId = this.makeStoreQuizIdKey(quiz.id);
		return chrome.storage.local.set({ [storageQuizId]: quiz }).catch((error) => {
			throw new Error(
				`Failed to update quiz with ID "${quiz.id}" in local storage: ${error.message}`
			);
		});
	}

	public static async addQuiz(quiz: IQuiz) {
		const oldQuiz = await this.getQuizByUrl(quiz.url);
		if (oldQuiz) {
			await this.removeQuiz(oldQuiz.id);
		}

		const storeQuizIdKey = this.makeStoreQuizIdKey(quiz.id);
		const storeQuizUrlKey = this.makeStoreQuizUrlKey(quiz);

		const quizIndexes = await this.getStoreQuizIndexes();
		quizIndexes.push({ idKey: storeQuizIdKey, urlKey: storeQuizUrlKey });

		return chrome.storage.local
			.set({
				[Constants.STORE_QUIZZES_KEY]: quizIndexes,
				[storeQuizIdKey]: quiz,
				[storeQuizUrlKey]: storeQuizIdKey,
			})
			.catch((error) => {
				throw new Error(
					`Failed to add new quiz with ID "${quiz.id}" to local storage: ${error.message}`
				);
			});
	}

	public static async removeQuizzes(quizIds: IQuiz['id'][]) {
		const quizIndexes = await this.getStoreQuizIndexes();
		const targetStoreQuizIdKeys = quizIds.map((quizId) =>
			this.makeStoreQuizIdKey(quizId)
		);

		const remainingIndexes: StoreQuizIndex[] = [];
		let removedKeys: (
			| StoreQuizIdKey
			| StoreQuizUrlKey
			| StoreQuizLastGradedQuestionIdKey
		)[] = [];
		for (const quizIndex of quizIndexes) {
			if (targetStoreQuizIdKeys.includes(quizIndex.idKey)) {
				removedKeys.push(
					quizIndex.idKey,
					quizIndex.urlKey,
					// Also remove last-graded question, if any
					this.makeStoreQuizLastGradedQuestionIdKey(this.extractQuizId(quizIndex.idKey))
				);
			} else {
				remainingIndexes.push(quizIndex);
			}
		}

		// Also remove quiz submission feedbacks
		const clearAllFeedbackPromises = quizIds.map((quizId) =>
			QuizFeedbackLocalStore.clearAllFeedback(quizId)
		);

		return chrome.storage.local
			.set({ [Constants.STORE_QUIZZES_KEY]: remainingIndexes })
			.then(() => chrome.storage.local.remove(removedKeys))
			.then(() => Promise.allSettled(clearAllFeedbackPromises))
			.catch((error) => {
				throw new Error(`Failed to remove quizzes from local storage: ${error.message}`);
			});
	}

	public static async removeQuiz(quizId: IQuiz['id']) {
		return this.removeQuizzes([quizId]).catch((error) => {
			console.error(
				`Failed to remove quiz with ID "${quizId}" from local storage: ${error.message}`
			);
		});
	}

	public static async setQuizLastGradedQuestion(
		quizId: IQuiz['id'],
		questionId: Nullable<IQuestion['id']>
	) {
		const quizLastGradedQuestionIdKey = this.makeStoreQuizLastGradedQuestionIdKey(quizId);
		return (
			questionId === null
				? chrome.storage.local.remove(quizLastGradedQuestionIdKey)
				: chrome.storage.local.set({ [quizLastGradedQuestionIdKey]: questionId })
		).catch((error) => {
			throw new Error(
				`Failed to set last-graded question ID "${questionId}" for quiz with ID "${quizId}" in local storage: ${error.message}`
			);
		});
	}
}
