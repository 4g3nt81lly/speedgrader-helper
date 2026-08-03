import actions from '#content/actions';
import useIframeHotkeys from '#content/hooks/useIframeHotkeys';
import { store } from '#content/stores';
import { useGradingContext } from '#content/stores/GradingContext';
import { useLayoutEffect } from 'react';

export default function IframeEventProxy() {
	const appSettings = store.useStore('appSettings');

	const submissionWindow = useGradingContext('submissionWindow');
	const submissionForm = useGradingContext('submissionForm');
	const document = submissionWindow.document;

	useIframeHotkeys(appSettings.hotkeys, document);

	function overrideSubmitOnKeyUp(event: KeyboardEvent) {
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

	function overrideOnSubmit(event: SubmitEvent) {
		// Prevent default form submission flow
		event.preventDefault();
		// Prevent other submit event handlers from running
		event.stopImmediatePropagation();
		// Prevent event handlers registered elsewhere from running
		event.stopPropagation();

		actions.gradingContext.submitAndSaveFeedback({ verboseNoOp: true });
	}

	useLayoutEffect(() => {
		document.addEventListener('keyup', overrideSubmitOnKeyUp, { capture: true });
		document.addEventListener('submit', overrideOnSubmit, { capture: true });

		return () => {
			document.removeEventListener('keyup', overrideSubmitOnKeyUp, { capture: true });
			document.removeEventListener('submit', overrideOnSubmit, { capture: true });
		};
	}, []);

	return <></>;
}
