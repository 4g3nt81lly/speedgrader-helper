import actions from '#content/actions';
import useToplevelHotkeys from '#content/hooks/useToplevelHotkeys';
import Selectors from '#content/selectors';
import { store } from '#content/stores';
import { useLayoutEffect, useMemo } from 'react';

export function ToplevelEventProxy() {
	const appSettings = store.useStore('appSettings');

	useToplevelHotkeys(appSettings.hotkeys);

	const selectors = useMemo(
		() => Selectors[appSettings.defaultQuizInjector],
		[appSettings.defaultQuizInjector]
	);
	const nextStudentButton = useMemo(
		() => document.querySelector<HTMLElement>(selectors.NEXT_STUDENT_BUTTON),
		[selectors.NEXT_STUDENT_BUTTON]
	);
	const prevStudentButton = useMemo(
		() => document.querySelector<HTMLElement>(selectors.PREV_STUDENT_BUTTON),
		[selectors.PREV_STUDENT_BUTTON]
	);
	const studentsMenu = useMemo(
		() => document.querySelector<HTMLElement>(selectors.STUDENTS_MENU),
		[selectors.STUDENTS_MENU]
	);

	async function overrideNavigation(event: PointerEvent | MouseEvent) {
		if (!event.isTrusted) {
			// Not triggered by user action, ignore
			return;
		}
		const gradingContext = store.state.gradingContext;
		if (!gradingContext) return;

		let oldEvent: Event;
		if (event instanceof PointerEvent) {
			oldEvent = new PointerEvent(event.type, event);
		} else {
			oldEvent = new MouseEvent(event.type, event);
		}
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();

		const result = await actions.gradingContext.submitAndSaveFeedback();
		if (result.status === 'success' || result.status === 'noop') {
			// Redispatch the event to trigger default behaviour
			event.target?.dispatchEvent(oldEvent);
		}
	}

	useLayoutEffect(() => {
		// TODO: post warning message if any of the following elements are absent
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
