import { syncPages, toastOnError } from '#pages/helpers';
import { broadcastMessageToTabs, sendMessageToBackground } from '#shared/message';
import {
	defaultAppSettings,
	type AppHotkeySettings,
	type AppSettings,
} from '#shared/settings';
import AppSettingsSyncStorage from '#shared/storage/AppSettings';
import StoreActions from '#shared/utils/browser/StoreActions';

export default class SettingsActions extends StoreActions<{ settings: AppSettings }> {
	@toastOnError('Unable to load app settings, please reload the page!')
	async load() {
		this.store.setState({ settings: await AppSettingsSyncStorage.getAll() });
	}

	set<Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) {
		this.update({ [key]: value });
	}

	@toastOnError()
	update(partialSettings: Partial<AppSettings>) {
		this.store.setState((state) => ({
			settings: { ...state.settings, ...partialSettings },
		}));
		return this.sync();
	}

	@toastOnError()
	updateHotkey<Name extends keyof AppHotkeySettings>(name: Name, hotkey: string) {
		return this.updateHotkeys({ [name]: hotkey });
	}

	private async updateHotkeys(partialHotkeys: Partial<AppHotkeySettings>) {
		this.store.setState((state) => ({
			settings: {
				...state.settings,
				hotkeys: { ...state.settings.hotkeys, ...partialHotkeys },
			},
		}));
		return this.sync();
	}

	@toastOnError('Unable to reset app settings, please try again!')
	override reset() {
		this.update(defaultAppSettings);
		return this.sync();
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
