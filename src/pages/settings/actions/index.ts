import { reloadSpeedGraderPages, syncPages } from '#pages/helpers';
import type { SettingsPageState } from '#pages/settings/stores';
import { sendMessageToBackground } from '#shared/message';
import type { ZustandStore } from '#shared/types/utils';
import StoreActions from '#shared/utils/browser/StoreActions';
import SettingsActions from './settings';

export default class SettingsPageActions extends StoreActions<SettingsPageState> {
	readonly settings: SettingsActions;

	public constructor(store: ZustandStore<SettingsPageState>) {
		super(store);
		this.settings = new SettingsActions(store);
	}

	async clearQuizzes() {
		await sendMessageToBackground({ name: 'quizzes.clear' });
		reloadSpeedGraderPages();
		syncPages();
	}
}
