import type { MainTab } from '#shared/types/store';
import DashboardPage from '#sidepanel/pages/dashboard/DashboardPage';
import SettingsPage from '#sidepanel/pages/settings/SettingsPage';
import { StyledEngineProvider, Tab, tabClasses, TabList, TabPanel, Tabs } from '@mui/joy';
import { useLayoutEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import global from './stores/global';
import store, { useMainSelector, type MainPageDispatch } from './stores/main.store';
import { loadQuizzesFromLocalStore } from './stores/quizzes.actions';
import {
	loadSelectionStateFromLocalStorage,
	saveSelectionStateToLocalStorage,
} from './stores/selection.actions';
import { selectMainTab } from './stores/selection.slice';
import { loadAppSettingsFromLocalStorage } from './stores/settings.actions';

export const enum SidePanelEvent {
	syncState = 'syncState',
}

function App() {
	const dispatch = useDispatch<MainPageDispatch>();
	const { mainTab } = useMainSelector('selection');

	function handleTabChange(tab: MainTab) {
		dispatch(selectMainTab(tab));
		dispatch(saveSelectionStateToLocalStorage());
	}

	useLayoutEffect(() => {
		(async () => {
			dispatch(loadAppSettingsFromLocalStorage());
			await dispatch(loadQuizzesFromLocalStore());
			dispatch(loadSelectionStateFromLocalStorage());
		})();
		// Register broadcast channel for syncing across side panel contexts
		const handleSyncSidePanel = ({ data }: MessageEvent<any>) => {
			if (data.type !== SidePanelEvent.syncState) return;
			// Sync quizzes with another instance of side panel, reload from local storage
			(async () => {
				await dispatch(loadAppSettingsFromLocalStorage());
				await dispatch(loadQuizzesFromLocalStore());
			})();
		};
		global.sidePanelChannel.addEventListener('message', handleSyncSidePanel);

		const socket = io(import.meta.env.VITE_DEV_WS_SERVER_URI, {
			transports: ['websocket'],
			auth: { role: 'app' },
		});
		socket.on('hr', (name) => name === 'reloadSidePanel' && window.location.reload());

		return () => {
			global.sidePanelChannel.removeEventListener('message', handleSyncSidePanel);
			socket.disconnect();
		};
	}, []);

	return (
		<Tabs
			value={mainTab}
			onChange={(_, newValue) => handleTabChange(newValue as MainTab)}
			className="my-2 h-full bg-transparent"
		>
			<TabList
				disableUnderline
				className="mx-auto items-center rounded-xl p-1.5"
				sx={{
					bgcolor: 'background.level1',
					[`.${tabClasses.root}`]: {
						borderRadius: 'lg',
						padding: '0pt 10pt',
						minBlockSize: 32,
					},
					[`.${tabClasses.root}[aria-selected='true']`]: {
						boxShadow: 'sm',
						bgcolor: 'background.surface',
					},
				}}
			>
				<Tab value="dashboard" disableIndicator>
					Dashboard
				</Tab>
				<Tab value="settings" disableIndicator>
					Settings
				</Tab>
			</TabList>
			<TabPanel value="dashboard" keepMounted className="overflow-hidden p-0">
				<DashboardPage />
			</TabPanel>
			<TabPanel value="settings" keepMounted className="overflow-hidden p-0">
				<SettingsPage />
			</TabPanel>
		</Tabs>
	);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<ReduxProvider store={store}>
		<StyledEngineProvider enableCssLayer>
			<App />
		</StyledEngineProvider>
	</ReduxProvider>
);
