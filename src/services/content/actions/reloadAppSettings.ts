import { useContentStore } from '#content/stores/main.store';
import { postSnackbarItem } from '#content/stores/snackbar.store';
import Constants from '#shared/constants';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';

export default async function reloadAppSettings() {
	try {
		useContentStore.setState({ appSettings: await AppSettingsLocalStore.getAll() });

		postSnackbarItem({
			message: 'SpeedGrader Helper settings updated.',
			timeoutMs: 2 * Constants.SECOND_MS,
		});
	} catch (error) {
		console.error('Failed to reload app settings:', error);
		postSnackbarItem({
			message:
				'An error occurred while reloading SpeedGrader Helper settings, please refresh the page.',
			closeReason: 'manual',
		});
	}
}
