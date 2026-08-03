import type { Nullable } from '#shared/types/utils';
import StateStore from '#shared/utils/browser/StateStore';
import type { ReactNode } from 'react';

export type SnackbarItem = {
	id: string;
	type?: SnackbarItemType;
	title?: string;
	message: string;
	icon?: string;
	timeoutSeconds?: number;
	retry?: {
		handler: () => void;
		tooltip?: string;
		icon?: ReactNode;
	};
	dismiss?: {
		tooltip?: string;
		icon?: ReactNode;
	};
	onDismiss?: () => void;
};

export type SnackbarItemType = 'info' | 'success' | 'error' | 'warning';

export type SnackbarState = {
	stack: string[];
	items: Record<string, SnackbarItem & { timeoutId: Nullable<number> }>;
};

export const snackbarState = new StateStore<SnackbarState>({
	stack: [],
	items: {},
});
