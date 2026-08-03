import reloadAppSettings from '#content/helpers/reloadAppSettings';
import { queue } from '#content/main';
import { store, type ContentState } from '#content/stores';
import AppSettingsSyncStorage from '#shared/storage/AppSettings';
import StoreActions from '#shared/utils/browser/StoreActions';
import GradingContextActions from './gradingContext';

class ContentActions extends StoreActions<ContentState> {
	readonly gradingContext = new GradingContextActions(this.store);

	async loadAppSettings() {
		const appSettings = await AppSettingsSyncStorage.getAll();
		this.store.setState({ appSettings });
		return appSettings;
	}

	reloadAppSettings() {
		return queue.run(reloadAppSettings.bind(this));
	}

	setGradingContext(gradingContext: ContentState['gradingContext']) {
		this.store.setState({ gradingContext });
	}
}

export default store.getActions(ContentActions);
