import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Typography } from '@mui/joy';
import { AnimatePresence, motion } from 'motion/react';
import { useLayoutEffect, useSyncExternalStore } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { inOutTransitionMotionProps } from '~/shared/animation';
import Constants from '~/shared/constants';
import { addCommandHandler, ContentCommand } from '~/shared/message';
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

let snackbar: SnackbarState = {
	stack: [],
	items: {},
};

export default function Snackbar() {
	const state = useSyncExternalStore(subscribe, () => snackbar);

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
							{...inOutTransitionMotionProps({
								opacity: [0, 1],
								scale: [0.9, 1],
							})}
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
								<Typography level="body-sm">{item.message}</Typography>
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

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notifyAll() {
	listeners.forEach((listener) => listener());
}

export function postSnackbarItem(item: Omit<ISnackbarItem, 'id'>) {
	const id = uuidv4();
	if (!item.closeReason || item.closeReason === 'timeout') {
		setTimeout(() => removeSnackbarItems(id), item.timeoutMs ?? 5 * Constants.SECOND_MS);
	}
	snackbar = {
		stack: [...snackbar.stack, id],
		items: { ...snackbar.items, [id]: { ...item, id } },
	};
	notifyAll();
}

export function removeSnackbarItems(items: string | string[]) {
	const itemIds = Array.isArray(items) ? items : [items];
	const newStack = snackbar.stack.filter((itemId) => !itemIds.includes(itemId));
	const newItems = { ...snackbar.items };
	for (const itemId of itemIds) {
		delete newItems[itemId];
	}
	snackbar = { stack: newStack, items: newItems };
	notifyAll();
}
