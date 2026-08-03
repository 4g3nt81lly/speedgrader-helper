import type { IQuiz } from '#models/Quiz';
import { broadcastMessageToTabs } from '#shared/message';
import global, { PageEvent } from './global';

export function syncPages() {
	global.pageChannel.postMessage({ type: PageEvent.syncState });
}

export function reloadSpeedGraderPages(...urls: IQuiz['url'][]) {
	return broadcastMessageToTabs({ name: 'app.reloadPage', urls });
}
