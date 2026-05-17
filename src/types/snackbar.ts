export type SnackbarItemType = 'neutral' | 'success' | 'error' | 'warning';

export interface ISnackbarItem {
	id: string;
	type?: SnackbarItemType;
	title?: string;
	message: string;
	icon?: string;
	closeReason?: 'timeout' | 'manual';
	timeoutMs?: number;
}

export const defaultSnackbarTitles: Record<SnackbarItemType, string> = {
	neutral: 'Message',
	success: 'Success',
	error: 'Error',
	warning: 'Warning',
};

export const defaultSnackbarIcons: Record<SnackbarItemType, string> = {
	neutral: 'ℹ️',
	success: '✅',
	error: '❌',
	warning: '⚠️',
};

export const defaultSnackbarBackgroundColors: Record<SnackbarItemType, string> = {
	neutral: '#f5f5f5',
	success: '#e8f5e9',
	error: '#ffebee',
	warning: '#fff8e1',
};
