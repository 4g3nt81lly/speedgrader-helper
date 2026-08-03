import { resetMainIDB } from '#shared/storage';

export async function factoryReset() {
	await resetMainIDB();
	await chrome.storage.local.clear();
	chrome.runtime.reload();
}
