import Constants from './constants';

export const enum PageEvent {
	syncState = 'syncState',
}

export default {
	pageChannel: new BroadcastChannel(Constants.PAGE_CHANNEL),
};
