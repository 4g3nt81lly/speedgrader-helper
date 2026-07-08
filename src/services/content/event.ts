export const enum ContentEvent {
	// Top-level events
	refreshGrades = 'sgh:refresh_grades',
	navigateSubmission = 'sgh:navigate_submission',

	// iframe events
	beginSubmitFeedback = 'sgh:begin_submit_feedback',
	endSubmitFeedback = 'sgh:end_submit_feedback',
}

export type ContentEventPayload = {
	[ContentEvent.refreshGrades]: {};
	[ContentEvent.navigateSubmission]: {
		direction: 'prev' | 'next';
	};

	[ContentEvent.beginSubmitFeedback]: {};
	[ContentEvent.endSubmitFeedback]: {
		success: boolean;
		questionIds: Set<string>;
	};
};

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
	return () => removeContentEventListener(name, eventHandler, target, options);
}

export function removeContentEventListener<E extends ContentEvent = ContentEvent>(
	name: E,
	handler: (event: Event) => void,
	target: EventTarget = window,
	options: EventListenerOptions = {}
) {
	target.removeEventListener(name, handler, options);
}
