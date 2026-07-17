import type { IQuiz } from '#models/Quiz';
import { getLocalStore } from '#shared/stores/utils';
import type { ILocalStore, MainTab } from '#shared/types/store';
import type { Nullable } from '#shared/types/utils';
import { useMainPageStore } from './main.store';

export function selectMainTab(tab: MainTab) {
	useMainPageStore.setState((state) => ({
		...state,
		selection: { ...state.selection, mainTab: tab },
	}));
	saveSelectionStateToLocalStorage();
}

export function selectQuiz(quizId: Nullable<IQuiz['id']>) {
	useMainPageStore.setState((state) => ({
		...state,
		selection: { ...state.selection, quiz: quizId },
	}));
	saveSelectionStateToLocalStorage();
}

export async function loadSelectionStateFromLocalStorage() {
	try {
		const selection = await getLocalStore.withType<ILocalStore>()('selection');
		if (!selection) {
			await chrome.storage.local.set<ILocalStore>({
				selection: useMainPageStore.getInitialState().selection,
			});
			return;
		}
		useMainPageStore.setState({ selection });
	} catch (error) {
		console.error('Failed to load selection state from local storage:', error);
		alert('Failed to load selection state from local storage');
	}
}

async function saveSelectionStateToLocalStorage() {
	try {
		await chrome.storage.local.set<ILocalStore>({
			selection: useMainPageStore.getState().selection,
		});
	} catch (error) {
		console.error('Failed to save selection state to local storage:', error);
		alert('Failed to save selection state to local storage');
	}
}
