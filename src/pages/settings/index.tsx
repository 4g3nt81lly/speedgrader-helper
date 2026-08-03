import { StyledEngineProvider } from '@mui/joy';
import ReactDOM from 'react-dom/client';
import SettingsPage from './SettingsPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<StyledEngineProvider enableCssLayer>
		<SettingsPage />
	</StyledEngineProvider>
);
