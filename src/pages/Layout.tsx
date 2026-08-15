import { reloadPage } from '#shared/utils/browser';
import { ErrorBoundary } from '#shared/utils/browser/ErrorBoundary';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import SentimentVeryDissatisfiedOutlinedIcon from '@mui/icons-material/SentimentVeryDissatisfiedOutlined';
import { Button, StyledEngineProvider, Typography } from '@mui/joy';
import type { PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

type LayoutProps = PropsWithChildren;

export default function Layout({ children }: LayoutProps) {
	return (
		<StyledEngineProvider enableCssLayer>
			<ErrorBoundary
				fallback={
					<div className="flex h-full flex-col items-center justify-center gap-3">
						<SentimentVeryDissatisfiedOutlinedIcon className="text-6xl text-gray-600" />
						<Typography level="body-lg">Oops, something went wrong!</Typography>
						<Typography>Please reload the page and try again!</Typography>
						<Button
							variant="plain"
							startDecorator={<ReplayOutlinedIcon className="text-xl" />}
							onClick={reloadPage}
						>
							Reload
						</Button>
					</div>
				}
			>
				{children}
				<Toaster />
			</ErrorBoundary>
		</StyledEngineProvider>
	);
}
