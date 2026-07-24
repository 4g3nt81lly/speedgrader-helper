import { useLayoutEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import navigateSubmission from './actions/navigateSubmission';
import { submitFeedback } from './actions/submitFeedback';
import { useAppSettings, useGradingContext } from './stores/main.store';

export function ToplevelEventProxy() {
	const appSettings = useAppSettings();

	useHotkeys(appSettings.hotkeys.quizSubmitFeedback, () => submitFeedback(), {
		preventDefault: true,
		eventListenerOptions: { capture: true },
	});

	useHotkeys(appSettings.hotkeys.quizNextSubmission, () => navigateSubmission('next'), {
		preventDefault: true,
		eventListenerOptions: { capture: true },
	});

	useHotkeys(appSettings.hotkeys.quizPrevSubmission, () => navigateSubmission('prev'), {
		preventDefault: true,
		eventListenerOptions: { capture: true },
	});

	return <></>;
}

export function InnerEventProxy() {
	const { submissionWindow, submissionForm } = useGradingContext();
	const document = submissionWindow.document;

	const appSettings = useAppSettings();

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

		submitFeedback();
	}

	useHotkeys(appSettings.hotkeys.quizSubmitFeedback, () => submitFeedback(), {
		document,
		enableOnFormTags: ['textarea'],
		preventDefault: true,
		eventListenerOptions: { capture: true },
	});

	useHotkeys(appSettings.hotkeys.quizNextSubmission, () => navigateSubmission('next'), {
		document,
		enableOnFormTags: ['textarea'],
		preventDefault: true,
		eventListenerOptions: { capture: true },
	});

	useHotkeys(appSettings.hotkeys.quizPrevSubmission, () => navigateSubmission('prev'), {
		document,
		enableOnFormTags: ['textarea'],
		preventDefault: true,
		eventListenerOptions: { capture: true },
	});

	useLayoutEffect(() => {
		document.addEventListener('keyup', overrideSubmitOnKeyUp, { capture: true });

		const submitHandler = submitFeedback.bind(null);
		document.addEventListener('submit', submitHandler, { capture: true });

		return () => {
			document.removeEventListener('keyup', overrideSubmitOnKeyUp, { capture: true });
			document.removeEventListener('submit', submitHandler, { capture: true });
		};
	}, []);

	return <></>;
}
