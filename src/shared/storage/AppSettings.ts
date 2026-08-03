import { defaultAppSettings, type AppSettings } from '#shared/settings';
import type { Nullable } from '#shared/types/utils';
import type { LocalStorageSchema } from './types';

export default class AppSettingsSyncStorage {
	public static async getAll(): Promise<AppSettings> {
		try {
			const { settings } =
				await chrome.storage.sync.get<Partial<LocalStorageSchema>>('settings');
			if (!settings) {
				await this.reset();
				return defaultAppSettings;
			}
			return settings;
		} catch (error) {
			throw new Error(`Failed to fetch app settings from persistent store: ${error}`);
		}
	}

	public static async get<Key extends keyof AppSettings>(
		key: Key,
		defaultValue: Nullable<AppSettings[Key]> = null
	): Promise<Nullable<AppSettings[Key]>> {
		const settings = await this.getAll();
		return settings[key] ?? defaultValue;
	}

	public static async set(partial: Partial<AppSettings>) {
		try {
			await chrome.storage.sync.set<LocalStorageSchema>({
				settings: { ...(await this.getAll()), ...partial },
			});
		} catch (error) {
			throw new Error(`Failed to update app settings in persistent store: ${error}`);
		}
	}

	public static async reset() {
		return chrome.storage.sync
			.set<LocalStorageSchema>({ settings: defaultAppSettings })
			.catch((error) => {
				throw new Error(`Failed to reset app settings in persistent store: ${error}`);
			});
	}
}
