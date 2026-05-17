import type { ISnackbarItem } from '~/types/snackbar';
import type { SetOptional } from '~/types/utils';

export const enum ContentEvent {
	pushSnackbarItem = 'sgh:push_snackbar_item',

	gradeSubmissionComplete = 'sgh:grade_submission_complete',
	saveQuestionFeedback = 'sgh:save_question_feedback',
	refreshGrades = 'sgh:refresh_grades',
	navigateSubmission = 'sgh:navigate_submission',
}

export type ContentEventPayload = {
	[ContentEvent.pushSnackbarItem]: {
		item: SetOptional<ISnackbarItem, 'id'>;
	};

	[ContentEvent.gradeSubmissionComplete]: {
		success: boolean;
	};
	[ContentEvent.saveQuestionFeedback]: {};
	[ContentEvent.refreshGrades]: {};
	[ContentEvent.navigateSubmission]: {
		direction: 'prev' | 'next';
	};
};

export const enum SidePanelEvent {
	syncState = 'syncState',
}

export function dispatchContentEvent<E extends ContentEvent = ContentEvent>(
	name: E,
	payload?: ContentEventPayload[E],
	target: EventTarget = window
) {
	target.dispatchEvent(new CustomEvent(name, { detail: payload ?? {} }));
}

export function addContentEventListener<E extends ContentEvent = ContentEvent>(
	name: E,
	handler: (payload: ContentEventPayload[E]) => void | Promise<void>,
	target: EventTarget = window,
	options: AddEventListenerOptions = {}
) {
	const eventHandler = (event: Event) => {
		const customEvent = <CustomEvent<ContentEventPayload[E]>>event;
		handler(customEvent.detail);
	};
	target.addEventListener(name, eventHandler, options);
	return eventHandler;
}

export function removeContentEventListener<E extends ContentEvent = ContentEvent>(
	name: E,
	handler: (event: Event) => void,
	target: EventTarget = window
) {
	target.removeEventListener(name, handler);
}
