import Constants from '#shared/constants';
import { TaskQueue } from '#shared/queues';

export default {
	sidePanelChannel: new BroadcastChannel(Constants.SIDEPANEL_CHANNEL),
	appSettingsActionQueue: new TaskQueue(Constants.APP_SETTINGS_ACTION_QUEUE_NAME),
};
