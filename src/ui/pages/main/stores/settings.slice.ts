import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { defaultAppSettings, type AppSettings } from '~/shared/settings';
import AppSettingsLocalStore from '~/shared/stores/AppSettingsLocalStore';
import global from './global';
import { syncSidePanelStates } from './helpers';
import type { MainPageStates } from './main.store';
import { loadAppSettingsFromLocalStorage } from './settings.actions';

const settingsSlice = createSlice({
	name: 'settings',
	initialState: <MainPageStates['settings']>defaultAppSettings,
	reducers: {
		set(settings, { payload: partialSettings }: PayloadAction<Partial<AppSettings>>) {
			Object.assign(settings, partialSettings);

			const updatedSettings: AppSettings = {
				...settings,
				hotkeys: { ...settings.hotkeys },
			};
			global.appSettingsActionQueue.run(async () => {
				await AppSettingsLocalStore.set(updatedSettings);
				syncSidePanelStates();
			});
		},
	},
	extraReducers(builder) {
		builder
			.addCase(
				loadAppSettingsFromLocalStorage.fulfilled,
				(settings, { payload: newSettings }) => {
					Object.assign(settings, { ...defaultAppSettings, ...newSettings });
				}
			)
			.addCase(loadAppSettingsFromLocalStorage.rejected, (_, { error }) => {
				console.error('Failed to load app settings from local storage:', error);
				alert('Failed to load app settings from local storage');
			});
	},
});

export const { set: updateAppSettings } = settingsSlice.actions;

export default settingsSlice.reducer;
