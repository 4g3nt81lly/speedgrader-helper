import type { ZustandStore } from '#shared/types/utils';

export default abstract class StoreActions<State> {
	protected store: ZustandStore<State>;

	public constructor(store: ZustandStore<State>) {
		this.store = store;
	}

	protected get state() {
		return this.store.getState();
	}

	protected get initialState() {
		return this.store.getInitialState();
	}

	reset() {
		this.store.setState(this.initialState);
	}
}
