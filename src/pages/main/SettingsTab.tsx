import SettingsView from '#pages/settings/SettingsView';
import actions from './actions';
import { mainPageState } from './stores';

export default function SettingsTab() {
	const settings = mainPageState.useStore('settings');

	return (
		<SettingsView
			settings={settings}
			settingsActions={actions.settings}
			clearQuizzes={() => actions.clearQuizzes()}
		/>
	);
}
