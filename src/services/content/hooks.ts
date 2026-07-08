import { useSyncExternalStore } from 'react';
import gradingContext, { subscribeToGradingContext } from './GradingContext';

export function useAppSettings() {
	return useSyncExternalStore(
		subscribeToGradingContext.bind(undefined, 'appSettings'),
		() => gradingContext.appSettings
	);
}

export function useFeedbackSubmitState() {
	return useSyncExternalStore(
		subscribeToGradingContext.bind(undefined, 'isFeedbackSubmitting'),
		() => gradingContext.isFeedbackSubmitting
	);
}
