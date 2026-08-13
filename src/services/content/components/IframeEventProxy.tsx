import actions from '#content/actions';
import { snackbar } from '#content/actions/snackbar';
import useIframeHotkeys from '#content/hooks/useIframeHotkeys';
import { store } from '#content/stores';
import { useGradingContext } from '#content/stores/GradingContext';
import { errorBoundary } from '#shared/utils/browser/ErrorBoundary';
import { useLayoutEffect } from 'react';

function IframeEventProxy() {
	const appSettings = store.useStore('appSettings');

	const submissionWindow = useGradingContext('submissionWindow');
	const submissionForm = useGradingContext('submissionForm');
	const document = submissionWindow.document;

	useIframeHotkeys(appSettings.hotkeys, document);

	function interceptSubmitOnKeyUp(event: KeyboardEvent) {
		if (
			event.key !== 'Enter' ||
			!(event.target as Element).matches('input') ||
			(event.target as HTMLInputElement).form !== submissionForm
		)
			return;

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();

		actions.gradingContext.submitAndSaveFeedback({ verboseNoOp: true });
	}

	function interceptSubmit(event: SubmitEvent) {
		// Prevent default form submission flow
		event.preventDefault();
		// Prevent other submit event handlers from running
		event.stopImmediatePropagation();
		// Prevent event handlers registered elsewhere from running
		event.stopPropagation();

		actions.gradingContext.submitAndSaveFeedback({ verboseNoOp: true });
	}

	useLayoutEffect(() => {
		document.addEventListener('keyup', interceptSubmitOnKeyUp, true);
		document.addEventListener('submit', interceptSubmit, true);

		return () => {
			document.removeEventListener('keyup', interceptSubmitOnKeyUp, true);
			document.removeEventListener('submit', interceptSubmit, true);
		};
	}, []);

	return <></>;
}

export default errorBoundary(IframeEventProxy, {
	onError(error, _info) {
		console.error(`Error in ${IframeEventProxy.name}:`, error);
		snackbar.post({
			message: `Something went wrong, please reload the page!\nError info: ${error instanceof Error ? error.message : 'unknown error'}`,
			type: 'error',
		});
	},
});
