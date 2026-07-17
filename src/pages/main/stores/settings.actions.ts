import { broadcastMessageToTabs, sendMessageToBackground } from '#shared/message';
import { type AppHotkeySettings, type AppSettings } from '#shared/settings';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';
import { BackgroundCommand, ContentCommand } from '#shared/types/message';
import { syncSidePanelStates } from './helpers';
import { useMainPageStore } from './main.store';

export function setAppSettings(partialSettings: Partial<Omit<AppSettings, 'hotkeys'>>) {
	useMainPageStore.setState((state) => ({
		settings: { ...state.settings, ...partialSettings },
	}));
	syncAppSettings();
}

export function setHotkeys(partialHotkeys: Partial<AppHotkeySettings>) {
	useMainPageStore.setState((state) => ({
		settings: {
			...state.settings,
			hotkeys: { ...state.settings.hotkeys, ...partialHotkeys },
		},
	}));
	syncAppSettings();
}

export async function loadAppSettingsFromLocalStorage() {
	try {
		useMainPageStore.setState({ settings: await AppSettingsLocalStore.getAll() });
	} catch (error) {
		console.error('Failed to load app settings from local storage:', error);
		alert('Failed to load app settings from local storage');
	}
}

async function syncAppSettings() {
	await sendMessageToBackground({
		command: BackgroundCommand.updateAppSettings,
		partialSettings: useMainPageStore.getState().settings,
	});
	broadcastMessageToTabs({ command: ContentCommand.reloadAppSettings });
	syncSidePanelStates();
}
