import { inOutTransitionMotionProps } from '#shared/animation';
import { addCommandHandler, ContentCommand } from '#shared/message';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Typography } from '@mui/joy';
import { AnimatePresence, motion } from 'motion/react';
import { useLayoutEffect } from 'react';
import { postSnackbarItem, removeSnackbarItems, useSnackbarState, type SnackbarItemType } from '.';

export default function Snackbar() {
	const state = useSnackbarState();

	useLayoutEffect(() => {
		// Register message listener for cross-context invocation
		return addCommandHandler(
			[ContentCommand.pushSnackbarItem, ContentCommand.popSnackbarItems],
			(message) => {
				if (message.command === ContentCommand.pushSnackbarItem) {
					postSnackbarItem(message.item);
				}
				if (message.command === ContentCommand.popSnackbarItems) {
					removeSnackbarItems(message.itemIds);
				}
			}
		);
	}, []);

	return (
		<motion.div className="fixed bottom-7 left-7 z-1000 flex size-fit max-w-1/2 flex-col justify-end gap-4 bg-transparent">
			<AnimatePresence>
				{state.stack.flatMap((itemId) => {
					const item = state.items[itemId]!;
					if (!item) return [];
					return (
						<motion.div
							key={itemId}
							className="control-shadow flex gap-4 rounded-2xl pt-1.5 pr-5 pb-2.5 pl-4.5"
							style={{ backgroundColor: defaultSnackbarBackgroundColors[item.type ?? 'neutral'] }}
							{...inOutTransitionMotionProps({ opacity: [0, 1], scale: [0.9, 1] })}
							layout
						>
							<motion.div className="flex justify-center" layout="position">
								<Typography level="h2">
									{item.icon ?? defaultSnackbarIcons[item.type ?? 'neutral']}
								</Typography>
							</motion.div>
							<motion.div className="flex flex-col" layout="position">
								<Typography level="body-md" fontWeight="bold">
									{item.title ?? defaultSnackbarTitles[item.type ?? 'neutral']}
								</Typography>
								<Typography level="body-sm" className="leading-snug">
									{item.message}
								</Typography>
							</motion.div>
							{item.closeReason === 'manual' && (
								<IconButton
									onClick={() => removeSnackbarItems(itemId)}
									className="hover:bg-transparent"
								>
									<CloseIcon />
								</IconButton>
							)}
						</motion.div>
					);
				})}
			</AnimatePresence>
		</motion.div>
	);
}

const defaultSnackbarTitles: Record<SnackbarItemType, string> = {
	neutral: 'Message',
	success: 'Success',
	error: 'Error',
	warning: 'Warning',
};

const defaultSnackbarIcons: Record<SnackbarItemType, string> = {
	neutral: 'ℹ️',
	success: '✅',
	error: '❌',
	warning: '⚠️',
};

const defaultSnackbarBackgroundColors: Record<SnackbarItemType, string> = {
	neutral: '#f5f5f5',
	success: '#e8f5e9',
	error: '#ffebee',
	warning: '#fff8e1',
};
