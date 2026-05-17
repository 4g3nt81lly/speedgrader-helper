import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Typography } from '@mui/joy';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Constants from '~/shared/constants';
import { addContentEventListener, ContentEvent, removeContentEventListener } from '~/shared/event';
import { addMessageListener, ContentCommand, type ICommandMessage } from '~/shared/message';
import {
	defaultSnackbarBackgroundColors,
	defaultSnackbarIcons,
	defaultSnackbarTitles,
	type ISnackbarItem,
} from '~/types/snackbar';

type SnackbarState = {
	stack: string[];
	items: Record<string, ISnackbarItem>;
};

export type SnackbarProps = {
	initialItems?: ISnackbarItem[];
};

export default function Snackbar({ initialItems }: SnackbarProps) {
	const [state, setState] = useState<SnackbarState>({ stack: [], items: {} });

	const pushItem = (item: Omit<ISnackbarItem, 'id'>) => {
		const id = uuidv4();
		if (!item.closeReason || item.closeReason === 'timeout') {
			setTimeout(() => popItems([id]), item.timeoutMs ?? 5 * Constants.SECOND_MS);
		}
		setState((state) => ({
			stack: [...state.stack, id],
			items: { ...state.items, [id]: { ...item, id } },
		}));
	};

	const popItems = (itemIds: string[]) =>
		setState((state) => {
			const newStack = state.stack.filter((itemId) => !itemIds.includes(itemId));
			const newItems = { ...state.items };
			for (const itemId of itemIds) {
				delete newItems[itemId];
			}
			return { stack: newStack, items: newItems };
		});

	useEffect(() => {
		for (const item of initialItems ?? []) {
			pushItem(item);
		}

		// Register event listener for invocation from the same content script context
		const pushItemEventHandler = addContentEventListener(
			ContentEvent.pushSnackbarItem,
			({ item }) => pushItem(item)
		);

		// Register message listener for cross-context invocation
		const removeMessageListener = addMessageListener(
			async (
				message:
					| ICommandMessage<ContentCommand.pushSnackbarItem>
					| ICommandMessage<ContentCommand.popSnackbarItems>
			) => {
				if (message.command === ContentCommand.pushSnackbarItem) {
					pushItem(message.item);
				}
				if (message.command === ContentCommand.popSnackbarItems) {
					const itemIds = message.itemIds;
					popItems(Array.isArray(itemIds) ? itemIds : [itemIds]);
				}
			}
		);

		return () => {
			removeContentEventListener(ContentEvent.pushSnackbarItem, pushItemEventHandler);
			removeMessageListener();
		};
	}, []);

	return (
		<motion.div className="fixed bottom-7 left-7 z-1000 flex size-fit max-w-1/2 flex-col justify-end gap-4 bg-transparent">
			<AnimatePresence>
				{state.stack.flatMap((itemId) => {
					const item = state.items[itemId];
					if (!item) return [];
					return (
						<motion.div
							key={itemId}
							className="control-shadow flex gap-4 rounded-2xl pt-1.5 pr-5 pb-2.5 pl-4.5"
							style={{ backgroundColor: defaultSnackbarBackgroundColors[item.type ?? 'neutral'] }}
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							layout
						>
							<div className="flex justify-center">
								<Typography level="h2">
									{item.icon ?? defaultSnackbarIcons[item.type ?? 'neutral']}
								</Typography>
							</div>
							<div className="flex flex-col">
								<Typography level="body-md" fontWeight="bold">
									{item.title ?? defaultSnackbarTitles[item.type ?? 'neutral']}
								</Typography>
								<Typography level="body-sm">{item.message}</Typography>
							</div>
							{item.closeReason === 'manual' && (
								<IconButton onClick={() => popItems([itemId])} className="hover:bg-transparent">
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
