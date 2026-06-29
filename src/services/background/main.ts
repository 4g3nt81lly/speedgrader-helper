import Constants from '~/shared/constants';
import {
	addMessageListener,
	BackgroundCommand,
	type ICommandMessage,
} from '~/shared/message';
import { TaskQueue } from '~/shared/queues';
import configDev from './dev';
import messageHandlers from './handlers';

export const quizActionQueue = new TaskQueue(Constants.QUIZ_ACTION_QUEUE_NAME);

// Allows users to open side panel by clicking on the action toolbar icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
	console.error(
		'Failed to enable click action toolbar icon to toggle side panel:',
		error
	);
});

addMessageListener((message: ICommandMessage<BackgroundCommand>) => {
	return messageHandlers[message.command]?.(<any>message);
});

if (import.meta.env.DEV) {
	configDev();
}

console.log('Background service worker loaded');
