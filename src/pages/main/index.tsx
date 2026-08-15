import global, { PageEvent } from '#pages/global';
import Layout from '#pages/Layout';
import { reloadPage } from '#shared/utils/browser';
import { Tab, tabClasses, TabList, TabPanel, Tabs } from '@mui/joy';
import { useLayoutEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { io } from 'socket.io-client';
import actions from './actions';
import DashboardTab from './DashboardTab';
import SettingsTab from './SettingsTab';
import { mainPageState, type MainTab } from './stores';

function MainPage() {
	const { mainTab } = mainPageState.useStore('selection');

	useLayoutEffect(() => {
		actions.loadQuizzes();
		// Register broadcast channel for syncing across side panel contexts
		const handleSyncSidePanel = ({ data }: MessageEvent<any>) => {
			if (data.type !== PageEvent.syncState) return;
			// Sync quizzes with another instance of side panel, reload from persistent storage
			Promise.allSettled([actions.settings.load(), actions.loadQuizzes()]);
		};
		global.pageChannel.addEventListener('message', handleSyncSidePanel);

		return () => {
			global.pageChannel.removeEventListener('message', handleSyncSidePanel);
		};
	}, []);

	useLayoutEffect(() => {
		if (import.meta.env.PROD) return;
		const socket = io(import.meta.env.VITE_DEV_WS_SERVER_URI, {
			transports: ['websocket'],
			auth: { role: 'app' },
		});
		socket.on('hr', (name) => name === 'reloadSidePanel' && reloadPage());
		return () => {
			socket.disconnect();
		};
	}, []);

	return (
		<Tabs
			value={mainTab}
			onChange={(_, newValue) => actions.selectTab(newValue as MainTab)}
			className="my-2 h-full bg-transparent"
		>
			<TabList
				disableUnderline
				className="mx-auto items-center rounded-2xl p-1.5"
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
				<DashboardTab />
			</TabPanel>
			<TabPanel value="settings" keepMounted className="overflow-hidden p-0">
				<SettingsTab />
			</TabPanel>
		</Tabs>
	);
}

Promise.all([actions.settings.load(), actions.loadSelection()]).then(() => {
	ReactDOM.createRoot(document.getElementById('root')!).render(
		<Layout>
			<MainPage />
		</Layout>
	);
});
