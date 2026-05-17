import type { IQuiz } from '~/models/Quiz';
import { OldSGQuizLoader } from '~/services/content/QuizLoader';
import { SidePanelEvent } from '~/shared/event';
import { broadcastMessageToTabs, ContentCommand } from '~/shared/message';
import global from './global';

export function syncSidePanelStates() {
	global.sidePanelChannel.postMessage({ type: SidePanelEvent.syncState });
}

export function reloadSpeedGraderPages(target: IQuiz['url'] | IQuiz['url'][]) {
	const targetUrls = Array.isArray(target) ? target : [target];
	broadcastMessageToTabs({ command: ContentCommand.reloadPage }, {}, (tab) => {
		if (tab.url === undefined) return false;
		const canonicalUrl = OldSGQuizLoader.getCanonicalURL(tab.url);
		return targetUrls.includes(canonicalUrl);
	});
}
