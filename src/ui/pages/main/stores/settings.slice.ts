import { broadcastMessageToTabs, sendMessageToBackground } from '#shared/message';
import { defaultAppSettings, type AppSettings } from '#shared/settings';
import { BackgroundCommand, ContentCommand } from '#shared/types/message';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
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
			sendMessageToBackground({
				command: BackgroundCommand.updateAppSettings,
				partialSettings: updatedSettings,
			}).then(() => {
				broadcastMessageToTabs({ command: ContentCommand.reloadAppSettings });
				syncSidePanelStates();
			});
		},
	},
	extraReducers(builder) {
		builder
			.addCase(
				loadAppSettingsFromLocalStorage.fulfilled,
				(settings, { payload: newSettings }) => {
					Object.assign(settings, newSettings);
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
