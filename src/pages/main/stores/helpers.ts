import { SGQuizLoader } from '#content/modules/SGQuizLoader';
import type { IQuiz } from '#models/Quiz';
import global, { SidePanelEvent } from './global';

export function syncSidePanelStates() {
	global.sidePanelChannel.postMessage({ type: SidePanelEvent.syncState });
}

export async function reloadSpeedGraderPages(target: IQuiz['url'] | IQuiz['url'][]) {
	const targetUrls = Array.isArray(target) ? target : [target];
	for (const tab of await chrome.tabs.query({})) {
		if (!tab.id || !tab.url) continue;
		const canonicalUrl = SGQuizLoader.getCanonicalURL(tab.url);
		if (targetUrls.includes(canonicalUrl)) {
			chrome.tabs.reload(tab.id);
		}
	}
}
