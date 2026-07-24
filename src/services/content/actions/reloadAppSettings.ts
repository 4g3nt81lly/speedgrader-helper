import { useContentStore } from '#content/stores/main.store';
import { postSnackbarItem } from '#content/stores/snackbar.store';
import AppSettingsLocalStore from '#shared/stores/AppSettingsLocalStore';

export default async function reloadAppSettings() {
	const { gradingContext } = useContentStore.getState();
	if (gradingContext?.isFeedbackSubmitting) {
		return postSnackbarItem({
			message:
				'Feedback submission in progress, settings not reloaded. Please retry after submission is complete.',
			type: 'warning',
			retry: { handler: reloadAppSettings },
		});
	}
	try {
		useContentStore.setState({ appSettings: await AppSettingsLocalStore.getAll() });

		postSnackbarItem({ message: 'Settings updated.', timeoutSeconds: 2 });
	} catch (error) {
		console.error('Failed to reload app settings:', error);
		postSnackbarItem({
			message: 'Unable to reload settings, please try again!',
			retry: { handler: reloadAppSettings },
		});
	}
}
