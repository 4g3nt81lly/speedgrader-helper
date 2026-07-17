import SettingsPage from '#pages/settings/SettingsPage';
import type { MainTab } from '#shared/types/store';
import { StyledEngineProvider, Tab, tabClasses, TabList, TabPanel, Tabs } from '@mui/joy';
import { useLayoutEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { io } from 'socket.io-client';
import DashboardPage from './dashboard/DashboardPage';
import global, { SidePanelEvent } from './stores/global';
import { useMainSelection } from './stores/main.store';
import { loadQuizzesFromLocalStore } from './stores/quizzes.actions';
import { loadSelectionStateFromLocalStorage, selectMainTab } from './stores/selection.actions';
import { loadAppSettingsFromLocalStorage } from './stores/settings.actions';

function App() {
	const mainTab = useMainSelection().mainTab;

	function handleTabChange(tab: MainTab) {
		selectMainTab(tab);
	}

	useLayoutEffect(() => {
		(async () => {
			loadAppSettingsFromLocalStorage();
			loadSelectionStateFromLocalStorage();
			loadQuizzesFromLocalStore();
		})();
		// Register broadcast channel for syncing across side panel contexts
		const handleSyncSidePanel = ({ data }: MessageEvent<any>) => {
			if (data.type !== SidePanelEvent.syncState) return;
			// Sync quizzes with another instance of side panel, reload from local storage
			(async () => {
				await loadAppSettingsFromLocalStorage();
				await loadQuizzesFromLocalStore();
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
	<StyledEngineProvider enableCssLayer>
		<App />
	</StyledEngineProvider>
);
