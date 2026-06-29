import Constants from '@shared/constants';
import { defaultAppSettings, type AppSettings } from '@shared/settings';
import type { ILocalStore } from '~/types/store';
import type { Nullable } from '~/types/utils';
import { getLocalStore } from './utils';

export default class AppSettingsLocalStore {
	public static async getAll(): Promise<Partial<AppSettings>> {
		return getLocalStore
			.withType<ILocalStore>()(Constants.STORE_APP_SETTINGS_KEY)
			.then((settings) => settings ?? {})
			.catch((error) => {
				throw new Error(
					`Failed to load app settings from local storage: ${error.message}`
				);
			});
	}

	public static async get(
		key: keyof AppSettings
	): Promise<Nullable<AppSettings[typeof key]>> {
		const settings = await this.getAll();
		return settings[key] ?? null;
	}

	public static async getOrDefault(
		key: keyof AppSettings,
		defaultValue: AppSettings[typeof key]
	): Promise<AppSettings[typeof key]> {
		return (await this.get(key)) ?? defaultValue;
	}

	public static async set(settings: Partial<AppSettings>) {
		const updatedSettings: Partial<AppSettings> = {
			...(await this.getAll()),
			...settings,
		};
		for (const [key, value] of Object.entries(updatedSettings)) {
			const settingKey = <keyof AppSettings>key;
			if (value === null || value === defaultAppSettings[settingKey]) {
				delete updatedSettings[settingKey];
			}
		}
		if (Object.keys(updatedSettings).length === 0) {
			return this.reset();
		}
		return chrome.storage.local
			.set({ [Constants.STORE_APP_SETTINGS_KEY]: updatedSettings })
			.catch((error) => {
				throw new Error(
					`Failed to update app settings in local storage: ${error.message}`
				);
			});
	}

	public static async reset() {
		return chrome.storage.local
			.remove(Constants.STORE_APP_SETTINGS_KEY)
			.catch((error) => {
				throw new Error(`Failed to reset app settings to default: ${error.message}`);
			});
	}
}
