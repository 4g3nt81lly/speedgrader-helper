import type { ZustandStore } from '#shared/types/utils';
import { useMemo } from 'react';
import { create, type StateCreator } from 'zustand';
import type StoreActions from './StoreActions';

export default class StateStore<State> {
	store: ZustandStore<State>;

	constructor(initialState: State | StateCreator<State>) {
		const creator = <StateCreator<State>>(
			(typeof initialState === 'function' ? initialState : () => initialState)
		);
		this.store = create<State>()(creator);
	}

	useStore(): State;
	useStore<Key extends keyof State>(key: Key): State[Key];
	useStore<Value>(selector: (store: State) => Value): Value;
	useStore<Key extends keyof State, Value>(selector?: Key | ((store: State) => Value)) {
		if (selector === undefined) {
			return this.store();
		}
		if (typeof selector === 'function') {
			return this.store(selector);
		}
		return this.store((state) => state[selector]);
	}

	get state() {
		return this.store.getState();
	}

	get initialState() {
		return this.store.getInitialState();
	}

	useActions<Actions extends StoreActions<Partial<State>>, ActionArgs extends any[]>(
		actions: new (store: ZustandStore<State>, ...args: ActionArgs) => Actions,
		...args: ActionArgs
	) {
		return useMemo(() => new actions(this.store, ...args), [...args]);
	}

	getActions<Actions extends StoreActions<Partial<State>>, ActionArgs extends any[]>(
		actions: new (store: ZustandStore<State>, ...args: ActionArgs) => Actions,
		...args: ActionArgs
	) {
		return new actions(this.store, ...args);
	}

	reset() {
		this.store.setState(this.initialState);
	}
}
