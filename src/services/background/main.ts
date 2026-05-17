/**
 * Background Service Worker
 * This runs in the background and can perform tasks that need to persist.
 */

import Constants from '~/shared/constants';
import {
	addMessageListener,
	type BackgroundCommand,
	type ICommandMessage,
} from '~/shared/message';
import { TaskQueue } from '~/shared/queues';
import messageHandlers from './handlers';

console.log('Background service worker loaded');

export const localStoreQueue = new TaskQueue(Constants.LOCAL_STORE_QUEUE_NAME);

// Allows users to open side panel by clicking on the action toolbar icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
	console.error(
		'Failed to enable click action toolbar icon to toggle side panel:',
		error
	);
});

addMessageListener(async (message: ICommandMessage<BackgroundCommand>) => {
	return messageHandlers[message.command]?.(<any>message);
});
