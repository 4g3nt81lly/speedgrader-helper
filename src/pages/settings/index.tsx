import { StyledEngineProvider } from '@mui/joy';
import ReactDOM from 'react-dom/client';
import SettingsPage from './SettingsPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<StyledEngineProvider enableCssLayer>
		<div className="mx-10 my-5 h-full overflow-y-scroll">
			<SettingsPage />
		</div>
	</StyledEngineProvider>
);
