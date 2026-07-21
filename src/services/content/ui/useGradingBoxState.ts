import { submitFeedback } from '#content/actions/submitFeedback';
import Selectors from '#content/selectors';
import {
	setLastGradedQuestion,
	updateQuestionDirtyState,
} from '#content/stores/gradingContext.actions';
import actions, {
	createSGFeedbackState,
	getQuestionGradingState,
} from '#content/stores/gradingStates.actions';
import { useContentStore, useGradingContext } from '#content/stores/main.store';
import {
	useQuestionGradingState,
	type DiffRubricItem,
	type SGFeedbackState,
} from '#content/stores/QuestionGradingState';
import { isDecimal, isDecimalEqual, isDecimalWithinRange } from '#shared/utils/decimal';
import { useLayoutEffect, useState, type ChangeEvent } from 'react';
import type { QuestionGradingBoxProps } from './QuestionGradingBox';

export default function useGradingBoxState(props: QuestionGradingBoxProps) {
	const { questionId } = props;

	const focusMode = useGradingContext((context) => context.quiz.focusMode);
	const isSubmitting = useGradingContext('isFeedbackSubmitting');

	const {
		question,
		boxState,
		sgState: lastSGState,
		sgElements: { container: questionContainer, pointsInput, commentsTextarea },
		isRegrading,
	} = useQuestionGradingState(questionId);

	// Transient UI states
	const [manualPoints, setManualPoints] = useState('');

	const isVisible = !focusMode || question.isFocused;
	const canGrade = Boolean(!isSubmitting && boxState && !boxState.readOnly);
	const canRegrade = Boolean(!isSubmitting && !isRegrading && boxState?.readOnly);
	const canReset = Boolean(
		!isSubmitting && boxState && (boxState.isDirty || isRegrading)
	);
	const canSubmit = Boolean(
		!isSubmitting && boxState && !boxState.readOnly && boxState.isDirty
	);

	function exportSGState(sgState: SGFeedbackState) {
		updatePointsInput(pointsInput, sgState.points ?? '');
		updateCommentsTextarea(commentsTextarea, sgState.comments);
	}

	function updateSGState() {
		const state = getQuestionGradingState(questionId);
		if (!state) return;

		const { boxState, sgState, isRegrading } = state;
		const defaultPoints = isRegrading ? '' : (sgState.points ?? '');
		const defaultComments = isRegrading ? '' : sgState.comments;
		exportSGState({
			points: boxState?.points ?? defaultPoints,
			comments: boxState ? actions.getQuestionComments(boxState) : defaultComments,
		});
	}

	function rubricItemCanToggle(rubricItem: DiffRubricItem) {
		if (!canGrade) return false;
		return actions.checkRubricItemCanToggle({ boxState }, question, rubricItem);
	}

	function toggleSelectRubricItem(rubricItem: DiffRubricItem) {
		if (!canGrade) return;
		actions.toggleSelectRubricItem(questionId, rubricItem);
		updateSGState();
	}

	function handleCommentsChange(event: ChangeEvent<HTMLTextAreaElement>) {
		if (!canGrade) return;
		actions.setQuestionComments(questionId, event.target.value);
		updateSGState();
	}

	function handleNewManualPointsChange(event: ChangeEvent<HTMLInputElement>) {
		if (!canGrade) return;
		setManualPoints(event.target.value);
		setLastGradedQuestion(questionId);
	}

	function applyManualPoints() {
		if (!canGrade || !boxState) return;
		if (
			!manualPoints ||
			!isDecimal(manualPoints) ||
			!isDecimalWithinRange(manualPoints, 0, question.points)
		)
			return;
		if (
			boxState.selectedRubricItems &&
			!confirm('Apply manual points? This will discard selected rubric items!')
		)
			return;

		actions.setQuestionManualPoints(questionId, manualPoints);
		updateSGState();
	}

	function handleRegrade() {
		if (!canRegrade || !boxState) return;
		if (
			!boxState.readOnly &&
			!confirm(
				'Grade this question from scratch? This will not delete feedback already submitted and saved.'
			)
		)
			return;

		actions.beginRegradeQuestion(questionId);
		exportSGState({ points: '', comments: '' });
	}

	function handleReset() {
		if (!canReset || !confirm('Reset to last-saved feedback?')) return;

		actions.resetQuestionGradingBoxState(questionId);
		exportSGState(lastSGState);
		setManualPoints('');
	}

	function handleSubmit() {
		if (!canSubmit) return;
		setLastGradedQuestion(questionId);
		submitFeedback();
	}

	function handleSGPointsInputChange() {
		const state = getQuestionGradingState(questionId);
		if (!state || state.boxState) return;

		const oldSGPoints = state.sgState.points;
		const { points: newSGPoints } = createSGFeedbackState(
			state.sgElements,
			state.question.points
		);
		const isClean = Boolean(
			// 1. Both are invalid or empty (ungraded)
			(!oldSGPoints && !newSGPoints) ||
			// 2. Both are nonempty and equal
			(oldSGPoints && newSGPoints && isDecimalEqual(oldSGPoints, newSGPoints))
		);
		updateQuestionDirtyState(questionId, !isClean);
		setLastGradedQuestion(questionId);
	}

	function handleSGCommentsChange() {
		const state = getQuestionGradingState(questionId);
		if (!state || state.boxState) return;

		const newSGComments = commentsTextarea.value;
		commentsTextarea.textContent = newSGComments;

		const oldSGComments = state.sgState.comments;
		updateQuestionDirtyState(questionId, newSGComments !== oldSGComments);
		setLastGradedQuestion(questionId);
	}

	useLayoutEffect(() => {
		const { appSettings, gradingContext } = useContentStore.getState();
		if (
			appSettings.scrollToLastGradedQuestion &&
			gradingContext!.lastGradedQuestionId === questionId
		) {
			questionContainer.scrollIntoView();
		}
	}, []);

	useLayoutEffect(() => {
		console.info(`${questionId}: question updated, reset SG state...`);
		exportSGState(lastSGState);
		setManualPoints('');
	}, [question]);

	useLayoutEffect(() => {
		console.info(`${questionId}: focus mode changed, updating visibility...`);
		setQuestionContainerVisible(questionContainer, isVisible);
		setManualPoints('');
	}, [isVisible]);

	useLayoutEffect(() => {
		if (boxState) {
			pointsInput.readOnly = commentsTextarea.readOnly = true;
			pointsInput.addEventListener('input', handleSGPointsInputChange);
			commentsTextarea.addEventListener('input', handleSGCommentsChange);
			return () => {
				pointsInput.removeEventListener('input', handleSGPointsInputChange);
				commentsTextarea.removeEventListener('input', handleSGCommentsChange);
			};
		} else {
			pointsInput.readOnly = commentsTextarea.readOnly = false;
		}
	}, [boxState === null]);

	return {
		question,
		boxState,
		lastSGState,

		newManualPoints: manualPoints,
		isSubmitting,
		isVisible,
		isRegrading,
		canGrade,
		canRegrade,
		canReset,
		canSubmit,

		rubricItemCanToggle,
		toggleSelectRubricItem,
		handleNewManualPointsChange,
		applyManualPoints,
		handleCommentsChange,

		handleRegrade,
		handleReset,
		handleSubmit,
	};
}

function setQuestionContainerVisible(questionContainer: HTMLElement, visible: boolean) {
	if (visible) {
		questionContainer.classList.remove(Selectors.app.HIDDEN_QUESTION_CLASS);
	} else {
		questionContainer.classList.add(Selectors.app.HIDDEN_QUESTION_CLASS);
	}
}

function updatePointsInput(pointsInput: HTMLInputElement, points: string) {
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

function updateCommentsTextarea(commentsTextarea: HTMLTextAreaElement, comments: string) {
	commentsTextarea.value = comments;
	commentsTextarea.textContent = comments;
}
