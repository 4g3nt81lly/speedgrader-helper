import { createAsyncThunk } from '@reduxjs/toolkit';
import { MainTab } from '~/shared/enums';
import { getLocalStore } from '~/shared/stores/utils';
import type { ILocalStore } from '~/types/store';
import type { MainPageThunkAPI } from './main.store';

export const loadSelectionStateFromLocalStorage = createAsyncThunk<
	ILocalStore['selection'],
	void,
	MainPageThunkAPI
>('selection/load-from-local-store', async () => {
	const selection = await getLocalStore.withType<ILocalStore>()('selection');
	if (!selection) {
		// TODO: Determine if this is necessary and/or find a more elegant way
		// Attempt to restore the missing field with default value
		const defaultSelection: ILocalStore['selection'] = {
			mainTab: MainTab.Dashboard,
			quiz: null,
		};
		chrome.storage.local.set<ILocalStore>({ selection: defaultSelection });
		return defaultSelection;
	}
	return selection;
});

export const saveSelectionStateToLocalStorage = createAsyncThunk<
	void,
	void,
	MainPageThunkAPI
>('selection/save-to-local-store', async (_, { getState }) => {
	const { selection } = getState();
	return chrome.storage.local.set<ILocalStore>({ selection });
});
