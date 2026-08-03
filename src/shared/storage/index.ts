import SharedConstants from '#shared/constants';
import { openDB, type IDBPTransaction, type StoreNames } from 'idb';
import QuizFeedbackIDBStore from './QuizFeedback';
import QuizzesIDBStore from './Quizzes';
import type { MainIDBSchema } from './types';

const IDB_VERSION = 1;

export const mainIDBPromise = openDB<MainIDBSchema>(
	SharedConstants.MAIN_IDB_NAME,
	IDB_VERSION,
	{
		upgrade(db, oldVersion, newVersion) {
			QuizzesIDBStore.migrate(db, oldVersion, newVersion);
			QuizFeedbackIDBStore.migrate(db, oldVersion, newVersion);
		},
	}
);

export async function resetMainIDB() {
	await QuizzesIDBStore.clear();
}

export async function mainIDBTransaction<
	Result,
	Stores extends ArrayLike<StoreNames<MainIDBSchema>>,
	Mode extends IDBTransactionMode,
>(
	stores: Stores,
	handler: (
		transaction: IDBPTransaction<MainIDBSchema, Stores, Mode>
	) => Result | Promise<Result>,
	mode: Mode
): Promise<Result> {
	const transaction = (await mainIDBPromise).transaction(stores, mode);
	const result = await handler(transaction);
	await transaction.done;
	return result;
}
