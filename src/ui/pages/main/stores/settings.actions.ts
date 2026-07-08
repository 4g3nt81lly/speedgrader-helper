import { type AppSettings } from '#shared/settings';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { MainPageThunkAPI } from './main.store';

export const loadAppSettingsFromLocalStorage = createAsyncThunk<
	Partial<AppSettings>,
	void,
	MainPageThunkAPI
>('settings/load-from-local-store', async () => AppSettingsLocalStore.getAll());
