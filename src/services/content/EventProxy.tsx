import { useLayoutEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ContentEvent, dispatchContentEvent } from '~/services/content/event';
import Constants from '~/shared/constants';
import {
	addCommandHandler,
	BackgroundCommand,
	ContentCommand,
	sendMessageToBackground,
} from '~/shared/message';
import { type AppSettings } from '~/shared/settings';
import AppSettingsLocalStore from '~/shared/stores/AppSettingsLocalStore';
import { pushSnackbarItem } from '~/shared/utils';
import globals from './global';

type EventProxyProps = {
	initialAppSettings: AppSettings;

	iframeWindow: Window;
	gradingForm: HTMLFormElement;
};

export default function EventProxy(props: EventProxyProps) {
	const { initialAppSettings, iframeWindow, gradingForm } = props;
	const document = iframeWindow.document;

	const [appSettings, setAppSettings] = useState(initialAppSettings);

	const { current: state } = useRef<{
		isSubmitting: boolean;
	}>({
		isSubmitting: false,
	});

	async function handleSubmit(event?: SubmitEvent, navigate?: 'next' | 'prev') {
		if (state.isSubmitting) return null;
		state.isSubmitting = true;
		dispatchContentEvent(ContentEvent.beginSubmitFeedback, {}, iframeWindow);

		// Prevent default form submission flow
		event?.preventDefault();
		// Prevent other submit event handlers from running
		event?.stopImmediatePropagation();
		// Prevent event handlers registered elsewhere from running
		event?.stopPropagation();

		// Update last-graded question before navigating
		if (globals.quizLastGradedQuestionId) {
			await sendMessageToBackground(
				{
					command: BackgroundCommand.updateQuizLastGradedQuestion,
					quizId: globals.quizId!,
					questionId: globals.quizLastGradedQuestionId,
				},
				{ noThrowOnNoReceiver: true }
			);
		}

		// Manually submit using form data
		try {
			var response = await fetch(gradingForm.action, {
				method: gradingForm.method,
				body: new FormData(gradingForm),
				redirect: 'follow',
			});
		} catch (error) {
			console.error('Failed to submit form data:', error);
			pushSnackbarItem(
				{
					title: 'Save Error',
					message: 'Unable to submit feedback. Please refresh the page and try again!',
					type: 'error',
					closeReason: 'manual',
				},
				'iframe'
			);
			return false;
		}
		if (response.ok) {
			// Refresh grades and update stats in SpeedGrader header
			dispatchContentEvent(ContentEvent.refreshGrades, {}, window);
			pushSnackbarItem({
				message: 'Successfully submitted feedback!',
				type: 'success',
				timeoutMs: 2 * Constants.SECOND_MS,
			});
		} else {
			pushSnackbarItem({
				message: 'Unable to submit feedback. Please refresh the page and try again!',
				type: 'error',
				timeoutMs: 3 * Constants.SECOND_MS,
			});
		}
		if (response.ok && navigate) {
			dispatchContentEvent(ContentEvent.navigateSubmission, { direction: navigate }, window);
		}

		// Notify whomever might be interested in this event
		dispatchContentEvent(ContentEvent.endSubmitFeedback, { success: response.ok }, iframeWindow);
		state.isSubmitting = false;
		return response.ok;
	}

	useHotkeys(appSettings.hotkeys.quizSubmitFeedback, () => handleSubmit(), { document });

	useHotkeys(appSettings.hotkeys.quizNextSubmission, () => handleSubmit(undefined, 'next'), {
		document,
	});

	useHotkeys(appSettings.hotkeys.quizPrevSubmission, () => handleSubmit(undefined, 'prev'), {
		document,
	});

	useLayoutEffect(() => {
		const removeCommandHandler = addCommandHandler(ContentCommand.reloadAppSettings, () => {
			(async () => setAppSettings({ ...appSettings, ...(await AppSettingsLocalStore.getAll()) }))();
		});
		globals.submitFeedback = handleSubmit.bind(undefined, undefined);
		document.addEventListener('submit', handleSubmit, { capture: true });

		return () => {
			document.removeEventListener('submit', handleSubmit, { capture: true });
			removeCommandHandler();
		};
	}, []);

	return <></>;
}
