import Constants from '#shared/constants';

export const enum SidePanelEvent {
	syncState = 'syncState',
}

export default {
	sidePanelChannel: new BroadcastChannel(Constants.SIDEPANEL_CHANNEL),
};
