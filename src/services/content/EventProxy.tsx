import { useLayoutEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import gradingContext from './GradingContext';
import { useAppSettings } from './hooks';

type EventProxyProps = {};

export default function EventProxy(props: EventProxyProps) {
	const document = gradingContext.submissionWindow!.document;

	const appSettings = useAppSettings();

	function overrideSubmitOnKeyUp(event: KeyboardEvent) {
		if (
			event.key !== 'Enter' ||
			!(event.target as Element).matches('input') ||
			(event.target as HTMLInputElement).form !== gradingContext.submissionForm!
		)
			return;

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();

		gradingContext.submitFeedback();
	}

	useHotkeys(appSettings.hotkeys.quizSubmitFeedback, () => gradingContext.submitFeedback(), {
		document,
	});

	useHotkeys(
		appSettings.hotkeys.quizNextSubmission,
		() => gradingContext.navigateSubmission('next'),
		{ document }
	);

	useHotkeys(
		appSettings.hotkeys.quizPrevSubmission,
		() => gradingContext.navigateSubmission('prev'),
		{ document }
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
