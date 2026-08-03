import type {
	SGFeedbackState,
	SGQuestionDOMElements,
} from '#content/stores/QuestionGradingState';

export function updatePointsInput(pointsInput: HTMLInputElement, points: string) {
	if (points === pointsInput.value) return;

	// Simulate input element gaining focus
	pointsInput.dispatchEvent(
		new FocusEvent('focus', {
			bubbles: false,
			composed: true,
			view: window,
		})
	);
	// Simulate user clicking on the input element
	const rect = pointsInput.getBoundingClientRect();
	const clientX = rect.left + rect.width / 2;
	const clientY = rect.top + rect.height / 2;
	pointsInput.dispatchEvent(
		new PointerEvent('click', {
			pointerType: 'mouse',
			bubbles: true,
			composed: true,
			clientX,
			clientY,
			detail: 1,
		})
	);
	// Update input value
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
		pointsInput,
		points
	);
	// Simulate user inserting text into the input element
	pointsInput.dispatchEvent(
		new InputEvent('insertText', {
			data: points,
			inputType: 'insertText',
			bubbles: true,
		})
	);
	// Simulate input text change event
	pointsInput.dispatchEvent(new Event('change', { bubbles: true }));
	// Simulate lose focus via blur
	pointsInput.dispatchEvent(
		new FocusEvent('blur', {
			bubbles: false,
			composed: true,
			view: window,
		})
	);
}

export function updateCommentsTextarea(
	commentsTextarea: HTMLTextAreaElement,
	comments: string
) {
	commentsTextarea.value = comments;
	commentsTextarea.textContent = comments;
}

export function writeSGState(
	sgElements: SGQuestionDOMElements,
	sgState: SGFeedbackState
) {
	updatePointsInput(sgElements.pointsInput, sgState.points ?? '');
	updateCommentsTextarea(sgElements.commentsTextarea, sgState.comments);
}
