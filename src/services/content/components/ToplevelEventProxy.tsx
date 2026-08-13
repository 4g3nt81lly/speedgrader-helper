import actions from '#content/actions';
import { snackbar } from '#content/actions/snackbar';
import useToplevelHotkeys from '#content/hooks/useToplevelHotkeys';
import Selectors from '#content/selectors';
import { store } from '#content/stores';
import { errorBoundary } from '#shared/utils/browser/ErrorBoundary';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';

function ToplevelEventProxy() {
	const appSettings = store.useStore('appSettings');

	useToplevelHotkeys(appSettings.hotkeys);

	const selectors = useMemo(
		() => Selectors[appSettings.defaultQuizInjector],
		[appSettings.defaultQuizInjector]
	);

	const studentsMenuRef = useRef<HTMLElement>(null);

	const interceptUserNavigation = useCallback(async (event: PointerEvent | MouseEvent) => {
		if (!event.isTrusted || !event.target) {
			// Not triggered by user action or has no target, ignore
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
			event.target.dispatchEvent(oldEvent);
		}
	}, []);

	const handleDocumentMouseUp = useCallback((event: MouseEvent) => {
		if (!event.isTrusted || !(event.target instanceof Element)) {
			// Not triggered by user action or target is not an element, ignore
			return;
		}
		// Check if the target is a descendent of the students menu
		const studentsMenu = event.target.closest<HTMLElement>(selectors.STUDENTS_MENU);
		if (!studentsMenu) return;
		studentsMenuRef.current = studentsMenu;

		interceptUserNavigation(event);
		// Register mouseup listener on students menu directly
		studentsMenu.addEventListener('mouseup', interceptUserNavigation, true);
		document.removeEventListener('mouseup', handleDocumentMouseUp, true);
	}, []);

	useLayoutEffect(() => {
		const nextStudentButton = document.querySelector<HTMLElement>(selectors.NEXT_STUDENT_BUTTON);
		const prevStudentButton = document.querySelector<HTMLElement>(selectors.PREV_STUDENT_BUTTON);
		if (!nextStudentButton || !prevStudentButton) {
			snackbar.post({
				message: 'Fatal error: SpeedGrader navigation buttons not found. Please reload the page!',
				type: 'error',
			});
		}
		nextStudentButton?.addEventListener('click', interceptUserNavigation, true);
		prevStudentButton?.addEventListener('click', interceptUserNavigation, true);

		// Register mouseup event on document since students menu won't be available
		// until the user opens the menu for the first time
		if (!studentsMenuRef.current) {
			document.addEventListener('mouseup', handleDocumentMouseUp, true);
		}

		return () => {
			nextStudentButton?.removeEventListener('click', interceptUserNavigation, true);
			prevStudentButton?.removeEventListener('click', interceptUserNavigation, true);
			document.removeEventListener('mouseup', handleDocumentMouseUp, true);
			studentsMenuRef.current?.removeEventListener('mouseup', interceptUserNavigation, true);
		};
	}, [selectors]);

	return <></>;
}

export default errorBoundary(ToplevelEventProxy, {
	onError(error, _info) {
		console.error(`Error in ${ToplevelEventProxy.name}:`, error);
		snackbar.post({
			message: `Something went wrong, please reload the page!\nError info: ${error instanceof Error ? error.message : 'unknown error'}`,
			type: 'error',
		});
	},
});
