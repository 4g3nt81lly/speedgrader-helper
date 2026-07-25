import { useLayoutEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import navigateSubmission from './actions/navigateSubmission';
import { submitFeedback } from './actions/submitFeedback';
import { restoreSGFeedback } from './actions/updateSGInputs';
import Selectors from './selectors';
import { useAppSettings, useContentStore, useGradingContext } from './stores/main.store';

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

	function confirmNavigation(event: Event) {
		if (!event.isTrusted) {
			// Not triggered by user action, ignore
			return;
		}
		const gradingContext = useContentStore.getState().gradingContext;
		if (!gradingContext) return;
		const { dirtyQuestions, isFeedbackSubmitting } = gradingContext;

		if (
			isFeedbackSubmitting ||
			(dirtyQuestions.size > 0 &&
				!confirm(
					'Current submission has unsaved feedback, navigating away from this submission will discard them, proceed?'
				))
		) {
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
		} else {
			// Suppress SpeedGrader auto-caching unsaved feedback before navigating away
			restoreSGFeedback();
		}
	}

	useLayoutEffect(() => {
		const quizInjector = appSettings.defaultQuizInjector;
		const selectors = Selectors[quizInjector];

		const nextStudentButton = document.querySelector<HTMLElement>(selectors.NEXT_STUDENT_BUTTON);
		const prevStudentButton = document.querySelector<HTMLElement>(selectors.PREV_STUDENT_BUTTON);
		const studentsMenu = document.querySelector<HTMLElement>(selectors.STUDENTS_MENU);

		nextStudentButton?.addEventListener('click', confirmNavigation, { capture: true });
		prevStudentButton?.addEventListener('click', confirmNavigation, { capture: true });
		studentsMenu?.addEventListener('mouseup', confirmNavigation, { capture: true });

		return () => {
			nextStudentButton?.removeEventListener('click', confirmNavigation, { capture: true });
			prevStudentButton?.removeEventListener('click', confirmNavigation, { capture: true });
			studentsMenu?.addEventListener('mouseup', confirmNavigation, { capture: true });
		};
	}, [appSettings.defaultQuizInjector]);

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
		document.addEventListener('submit', submitFeedback, { capture: true });

		return () => {
			document.removeEventListener('keyup', overrideSubmitOnKeyUp, { capture: true });
			document.removeEventListener('submit', submitFeedback, { capture: true });
		};
	}, []);

	return <></>;
}
