import { StyledEngineProvider, Tab, tabClasses, TabList, TabPanel, Tabs } from '@mui/joy';
import { StrictMode, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';
import { MainTab } from '~/shared/enums';
import { SidePanelEvent } from '~/shared/event';
import ClipboardPage from '../clipboard/ClipboardPage';
import DashboardPage from '../dashboard/DashboardPage';
import SettingsPage from '../settings/SettingsPage';
import global from './stores/global';
import store, { useMainSelector, type MainPageDispatch } from './stores/main.store';
import { loadQuizzesFromLocalStore } from './stores/quizzes.actions';
import { loadSelectionStateFromLocalStorage } from './stores/selection.actions';
import { selectMainTab } from './stores/selection.slice';

function App() {
	const dispatch = useDispatch<MainPageDispatch>();
	const { mainTab } = useMainSelector('selection');

	useLayoutEffect(() => {
		(async () => {
			await dispatch(loadQuizzesFromLocalStore());
			await dispatch(loadSelectionStateFromLocalStorage());
		})();
		// Register broadcast channel for syncing across side panel contexts
		global.sidePanelChannel.onmessage = ({ data }) => {
			if (data.type !== SidePanelEvent.syncState) return;
			// Sync quizzes with another instance of side panel, reload from local storage
			(async () => {
				await dispatch(loadQuizzesFromLocalStore());
			})();
		};
	}, []);

	return (
		<Tabs
			value={mainTab}
			onChange={(_, newValue) => dispatch(selectMainTab(newValue as MainTab))}
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
				<Tab disableIndicator>Dashboard</Tab>
				<Tab disableIndicator>Clipboard</Tab>
				<Tab disableIndicator>Settings</Tab>
			</TabList>
			<TabPanel value={MainTab.Dashboard} keepMounted className="overflow-hidden p-0">
				<DashboardPage />
			</TabPanel>
			<TabPanel value={MainTab.Clipboard} keepMounted className="overflow-hidden p-0">
				<ClipboardPage />
			</TabPanel>
			<TabPanel value={MainTab.Settings} keepMounted className="overflow-hidden p-0">
				<SettingsPage />
			</TabPanel>
		</Tabs>
	);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ReduxProvider store={store}>
			<StyledEngineProvider enableCssLayer>
				<App />
			</StyledEngineProvider>
		</ReduxProvider>
	</StrictMode>
);
