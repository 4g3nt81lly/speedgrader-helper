import { useSelector } from 'react-redux';

export const useReduxSelector = {
	withType<State>() {
		return <Key extends keyof State>(key: Key) => {
			return useSelector<State, State[Key]>((state) => state[key]);
		};
	},
};
