import SettingsPageActions from './actions';
import SettingsView from './SettingsView';
import { settingsPageState } from './stores';

const settingsPageActions = settingsPageState.getActions(SettingsPageActions);

export default function SettingsPage() {
	const { settings } = settingsPageState.useStore();

	return (
		<div className="mx-10 my-5 h-full overflow-y-scroll">
			<SettingsView
				settings={settings}
				settingsActions={settingsPageActions.settings}
				clearQuizzes={() => settingsPageActions.clearQuizzes()}
			/>
		</div>
	);
}
