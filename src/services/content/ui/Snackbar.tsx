import { snackbar } from '#content/actions/snackbar';
import { snackbarState, type SnackbarItemType } from '#content/stores/snackbar';
import { inOutTransitionMotionProps } from '#shared/utils/browser/animation';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import { IconButton, Tooltip, Typography } from '@mui/joy';
import { AnimatePresence, motion } from 'motion/react';

export default function Snackbar() {
	const { stack, items } = snackbarState.useStore();

	return (
		<motion.div className="fixed bottom-7 left-7 z-1000 flex size-fit max-w-1/2 flex-col justify-end gap-4 bg-transparent">
			<AnimatePresence>
				{stack.flatMap((itemId) => {
					const item = items[itemId];
					if (!item) return [];

					const type = item.type ?? 'info';
					const dismissAction = () => {
						snackbar.remove(item.id);
						item.onDismiss?.();
					};
					const retryAction = () => {
						item.retry?.handler?.();
						dismissAction();
					};
					return (
						<motion.div
							key={itemId}
							className="control-shadow flex w-fit items-start justify-between gap-3 rounded-2xl pt-2 pr-4 pb-2.5 pl-4.5"
							style={{ backgroundColor: defaultSnackbarBackgroundColors[type] }}
							{...inOutTransitionMotionProps({ opacity: [0, 1], scale: [0.9, 1] })}
							layout
						>
							<motion.div className="flex gap-3" layout="position">
								<div className="flex justify-center">
									<Typography level="h4">{item.icon ?? defaultSnackbarIcons[type]}</Typography>
								</div>
								<div className="flex flex-col">
									<Typography level="title-md" fontWeight="bold">
										{item.title ?? defaultSnackbarTitles[type]}
									</Typography>
									<Typography level="body-sm" className="leading-snug">
										{item.message}
									</Typography>
								</div>
							</motion.div>

							<motion.div className="flex" layout="position">
								{item.retry && (
									<Tooltip title={item.retry.tooltip ?? 'Retry'}>
										<IconButton onClick={retryAction}>
											{item.retry.icon ?? <ReplayIcon />}
										</IconButton>
									</Tooltip>
								)}
								{(item.dismiss || item.timeoutId === null) && (
									<Tooltip title={item.dismiss?.tooltip ?? 'Dismiss'}>
										<IconButton onClick={dismissAction}>
											{item.dismiss?.icon ?? <CloseIcon />}
										</IconButton>
									</Tooltip>
								)}
							</motion.div>
						</motion.div>
					);
				})}
			</AnimatePresence>
		</motion.div>
	);
}

const defaultSnackbarTitles: Record<SnackbarItemType, string> = {
	info: 'Message',
	success: 'Success',
	error: 'Error',
	warning: 'Warning',
};

const defaultSnackbarIcons: Record<SnackbarItemType, string> = {
	info: 'ℹ️',
	success: '✅',
	error: '❌',
	warning: '⚠️',
};

const defaultSnackbarBackgroundColors: Record<SnackbarItemType, string> = {
	info: '#f5f5f5',
	success: '#e8f5e9',
	error: '#ffebee',
	warning: '#fff8e1',
};
