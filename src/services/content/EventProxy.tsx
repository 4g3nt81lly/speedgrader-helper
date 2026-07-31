import { useLayoutEffect, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import navigateSubmission from './actions/navigateSubmission';
import { submitFeedback } from './actions/submitFeedback';
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

	const selectors = useMemo(
		() => Selectors[appSettings.defaultQuizInjector],
		[appSettings.defaultQuizInjector]
	);
	const nextStudentButton = useMemo(
		() => document.querySelector<HTMLElement>(selectors.NEXT_STUDENT_BUTTON),
		[selectors]
	);
	const prevStudentButton = useMemo(
		() => document.querySelector<HTMLElement>(selectors.PREV_STUDENT_BUTTON),
		[selectors]
	);
	const studentsMenu = useMemo(
		() => document.querySelector<HTMLElement>(selectors.STUDENTS_MENU),
		[selectors]
	);

	async function overrideNavigation(event: PointerEvent | MouseEvent) {
		if (!event.isTrusted) {
			// Not triggered by user action, ignore
			return;
		}
		const gradingContext = useContentStore.getState().gradingContext;
		if (!gradingContext) return;
		const { isFeedbackSubmitting } = gradingContext;

		let oldEvent: Event;
		if (event instanceof PointerEvent) {
			oldEvent = new PointerEvent(event.type, event);
		} else {
			oldEvent = new MouseEvent(event.type, event);
		}
		new MouseEvent(event.type, event);
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();

		if (isFeedbackSubmitting) return;

		const success = await submitFeedback();
		if (success !== false) {
			event.target?.dispatchEvent(oldEvent);
		}
	}

	useLayoutEffect(() => {
		nextStudentButton?.addEventListener('click', overrideNavigation, { capture: true });
		prevStudentButton?.addEventListener('click', overrideNavigation, { capture: true });
		studentsMenu?.addEventListener('mouseup', overrideNavigation, { capture: true });

		return () => {
			nextStudentButton?.removeEventListener('click', overrideNavigation, { capture: true });
			prevStudentButton?.removeEventListener('click', overrideNavigation, { capture: true });
			studentsMenu?.addEventListener('mouseup', overrideNavigation, { capture: true });
		};
	}, [nextStudentButton, prevStudentButton, studentsMenu]);

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
