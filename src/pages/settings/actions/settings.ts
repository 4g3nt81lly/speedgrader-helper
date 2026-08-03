import { syncPages } from '#pages/helpers';
import { broadcastMessageToTabs, sendMessageToBackground } from '#shared/message';
import {
	defaultAppSettings,
	type AppHotkeySettings,
	type AppSettings,
} from '#shared/settings';
import AppSettingsSyncStorage from '#shared/storage/AppSettings';
import StoreActions from '#shared/utils/browser/StoreActions';

export default class SettingsActions extends StoreActions<{ settings: AppSettings }> {
	async load() {
		try {
			this.store.setState({ settings: await AppSettingsSyncStorage.getAll() });
		} catch (error) {
			console.error('Failed to load app settings from persistent storage:', error);
			alert('Failed to load app settings from persistent storage');
		}
	}

	set<Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) {
		this.update({ [key]: value });
	}

	update(partialSettings: Partial<AppSettings>) {
		this.store.setState((state) => ({
			settings: { ...state.settings, ...partialSettings },
		}));
		this.sync();
	}

	updateHotkey<Name extends keyof AppHotkeySettings>(name: Name, hotkey: string) {
		this.updateHotkeys({ [name]: hotkey });
	}

	updateHotkeys(partialHotkeys: Partial<AppHotkeySettings>) {
		this.store.setState((state) => ({
			settings: {
				...state.settings,
				hotkeys: { ...state.settings.hotkeys, ...partialHotkeys },
			},
		}));
		this.sync();
	}

	override reset() {
		this.update(defaultAppSettings);
		this.sync();
	}

	private async sync() {
		await sendMessageToBackground({
			name: 'app.updateSettings',
			partial: this.state.settings,
		});
		broadcastMessageToTabs({ name: 'app.reloadSettings' });
		syncPages();
	}
}
