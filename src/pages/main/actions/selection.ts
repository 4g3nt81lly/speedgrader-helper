import type { IQuiz } from '#models/Quiz';
import type { MainPageState, MainTab } from '#pages/main/stores';
import SelectionLocalStorage from '#shared/storage/Selection';
import type { Nullable } from '#shared/types/utils';
import StoreActions from '#shared/utils/browser/StoreActions';

export default class SelectionActions extends StoreActions<
	Pick<MainPageState, 'selection'>
> {
	selectMainTab(mainTab: MainTab) {
		this.store.setState((state) => ({
			...state,
			selection: { ...state.selection, mainTab },
		}));
		this.save();
	}

	selectQuiz(quizId: Nullable<IQuiz['id']>) {
		this.store.setState((state) => ({
			...state,
			selection: { ...state.selection, quiz: quizId },
		}));
		this.save();
	}

	async load() {
		try {
			const selection = await SelectionLocalStorage.get();
			if (!selection) {
				return this.reset();
			}
			this.store.setState({ selection });
		} catch (error) {
			console.error('Failed to load selection state from local storage:', error);
			alert('Failed to load selection state from local storage');
		}
	}

	async save() {
		try {
			await SelectionLocalStorage.set(this.store.getState().selection);
		} catch (error) {
			console.error('Failed to save selection state to local storage:', error);
			alert('Failed to save selection state to local storage');
		}
	}

	override async reset() {
		const initial = this.store.getInitialState().selection;
		try {
			await SelectionLocalStorage.set(initial);
			this.store.setState({ selection: initial });
		} catch (error) {
			console.error('Failed to reset selection state:', error);
			alert('Failed to reset selection state');
		}
	}
}
