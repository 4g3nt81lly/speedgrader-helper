import { defaultAppSettings, type AppSettings } from '#shared/settings';
import StateStore from '#shared/utils/browser/StateStore';

export type SettingsPageState = {
	settings: AppSettings;
};

export const settingsPageState = new StateStore<SettingsPageState>({
	settings: defaultAppSettings,
});
