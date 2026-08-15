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
		return this.save();
	}

	selectQuiz(quizId: Nullable<IQuiz['id']>) {
		this.store.setState((state) => ({
			...state,
			selection: { ...state.selection, quiz: quizId },
		}));
		return this.save();
	}

	async load() {
		const selection = await SelectionLocalStorage.get();
		if (selection) {
			this.store.setState({ selection });
		} else {
			return this.reset();
		}
	}

	private save() {
		return SelectionLocalStorage.set(this.store.getState().selection);
	}

	override reset() {
		const initial = this.store.getInitialState().selection;
		this.store.setState({ selection: initial });
		return SelectionLocalStorage.set(initial);
	}
}
