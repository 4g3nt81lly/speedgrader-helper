import type actions from '#content/actions';
import { snackbar } from '#content/actions/snackbar';

export default async function reloadAppSettings(this: typeof actions) {
	try {
		await this.loadAppSettings();

		snackbar.post({ message: 'Settings updated.', timeoutSeconds: 2 });
	} catch (error) {
		console.error('Failed to reload app settings:', error);
		snackbar.post({
			message: 'Unable to reload settings, please try again!',
			retry: { handler: () => this.reloadAppSettings() },
		});
	}
}
