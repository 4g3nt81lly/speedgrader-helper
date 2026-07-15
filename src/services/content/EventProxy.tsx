import { useLayoutEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import gradingContext from './GradingContext';
import { useAppSettings } from './hooks';

export function ToplevelEventProxy() {
	const appSettings = useAppSettings();

	useHotkeys(appSettings.hotkeys.quizSubmitFeedback, () => gradingContext.submitFeedback(), {
		preventDefault: true,
		eventListenerOptions: { capture: true },
	});

	useHotkeys(
		appSettings.hotkeys.quizNextSubmission,
		() => gradingContext.navigateSubmission('next'),
		{
			preventDefault: true,
			eventListenerOptions: { capture: true },
		}
	);

	useHotkeys(
		appSettings.hotkeys.quizPrevSubmission,
		() => gradingContext.navigateSubmission('prev'),
		{
			preventDefault: true,
			eventListenerOptions: { capture: true },
		}
	);

	return <></>;
}

export function SubmissionEventProxy() {
	if (!gradingContext.quiz) {
		throw new Error('Fatal error: Invalid grading context');
	}
	const document = gradingContext.submissionWindow.document;

	const appSettings = useAppSettings();

	function overrideSubmitOnKeyUp(event: KeyboardEvent) {
		if (
			event.key !== 'Enter' ||
			!(event.target as Element).matches('input') ||
			(event.target as HTMLInputElement).form !== gradingContext.submissionForm
		)
			return;

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();

		gradingContext.submitFeedback();
	}

	useHotkeys(appSettings.hotkeys.quizSubmitFeedback, () => gradingContext.submitFeedback(), {
		document,
		enableOnFormTags: ['textarea'],
		preventDefault: true,
		eventListenerOptions: { capture: true },
	});

	useHotkeys(
		appSettings.hotkeys.quizNextSubmission,
		() => gradingContext.navigateSubmission('next'),
		{
			document,
			enableOnFormTags: ['textarea'],
			preventDefault: true,
			eventListenerOptions: { capture: true },
		}
	);

	useHotkeys(
		appSettings.hotkeys.quizPrevSubmission,
		() => gradingContext.navigateSubmission('prev'),
		{
			document,
			enableOnFormTags: ['textarea'],
			preventDefault: true,
			eventListenerOptions: { capture: true },
		}
	);

	useLayoutEffect(() => {
		document.addEventListener('keyup', overrideSubmitOnKeyUp, { capture: true });

		const submitHandler = gradingContext.submitFeedback.bind(gradingContext);
		document.addEventListener('submit', submitHandler, { capture: true });

		return () => {
			document.removeEventListener('keyup', overrideSubmitOnKeyUp, { capture: true });
			document.removeEventListener('submit', submitHandler, { capture: true });
		};
	}, []);

	return <></>;
}
