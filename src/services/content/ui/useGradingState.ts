import {
	addContentEventListener,
	ContentEvent,
	type ContentEventPayload,
} from '#content/event';
import gradingContext from '#content/GradingContext';
import { useAppSettings, useFeedbackSubmitState } from '#content/hooks';
import Selectors from '#content/selectors';
import type { IQuestion } from '#models/Question';
import { isDecimalEqual, isDecimalWithinRange } from '#shared/decimal';
import {
	addCommandHandler,
	BackgroundCommand,
	ContentCommand,
	sendMessageToBackground,
	type CommandMessagePayload,
} from '#shared/message';
import type { Nullable } from '#shared/types/utils';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GradingBoxProps } from './GradingBox';
import {
	QuestionGradingState,
	type DiffRubricItem,
	type IQuestionGradingState,
} from './QuestionGradingState';
import { postSnackbarItem } from './snackbar';

export default function useGradingState(props: GradingBoxProps) {
	const {
		submissionId,
		initialQuiz,
		initialQuestion,
		initialFeedback,

		questionContainer,
		pointsInput,
		commentsTextarea,
	} = props;
	const submissionWindow = gradingContext.submissionWindow!;

	const appSettings = useAppSettings();

	const [question, setQuestion] = useState(initialQuestion);

	const [sgState, setSGState] = useState(() =>
		QuestionGradingState.createSGState(
			{
				points: pointsInput.value.trim(),
				comments: commentsTextarea.textContent!.trim(),
			},
			initialQuestion
		)
	);

	/** Most-recent feedback object submitted and saved to local storage */
	const [savedFeedback, setSavedFeedback] = useState(initialFeedback);
	// Object of the current UI state
	const [state, setState] = useState<Nullable<IQuestionGradingState>>(() =>
		QuestionGradingState.create(question, savedFeedback, sgState)
	);

	// Transient UI states
	const [manualPoints, setManualPoints] = useState('');
	const [isContainerVisible, setIsContainerVisible] = useState(
		!initialQuiz.focusMode || initialQuestion.isFocused
	);
	const [isRegrading, setIsRegrading] = useState(false);
	const isSubmitting = useFeedbackSubmitState();

	const { current: stateRef } = useRef({
		gradingState: state,
		savedFeedback,
		sgState,
		isRegrading,
	});

	function updateState(
		newState: Nullable<IQuestionGradingState>,
		updateSG: boolean = true
	) {
		if (updateSG) {
			const defaultPoints = stateRef.isRegrading ? '' : (stateRef.sgState.points ?? '');
			const defaultComments = stateRef.isRegrading ? '' : stateRef.sgState.comments;

			updatePointsInput(pointsInput, newState?.points ?? defaultPoints);
			updateCommentsTextarea(
				commentsTextarea,
				newState ? QuestionGradingState.getComments(newState) : defaultComments
			);
		}
		stateRef.gradingState = newState;
		setState(newState);
	}

	function rubricItemCanToggle(rubricItem: DiffRubricItem) {
		if (isSubmitting || !state) return false;
		return QuestionGradingState.checkRubricItemCanToggle(state, question, rubricItem);
	}

	function toggleSelectRubricItem(rubricItem: DiffRubricItem) {
		if (isSubmitting || !state?.isGradable) return;
		updateState(
			QuestionGradingState.toggleSelectRubricItem(state, sgState, question, rubricItem)
		);

		gradingContext.lastGradedQuestionId = initialQuestion.id;
	}

	function handleCommentsChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
		if (isSubmitting || !state?.isGradable) return;
		updateState(QuestionGradingState.updateComments(state, sgState, event.target.value));

		gradingContext.lastGradedQuestionId = initialQuestion.id;
	}

	function handleNewManualPointsChange(event: React.ChangeEvent<HTMLInputElement>) {
		setManualPoints(event.target.value);

		gradingContext.lastGradedQuestionId = initialQuestion.id;
	}

	function applyManualPoints() {
		if (isSubmitting || !state?.isGradable) return;
		if (
			!manualPoints ||
			!isFinite(Number(manualPoints)) ||
			!isDecimalWithinRange(manualPoints, 0, question.points)
		)
			return;
		if (
			state.selectedRubricItems &&
			!confirm('Apply manual points? This will discard selected rubric items!')
		)
			return;

		updateState(QuestionGradingState.applyManualPoints(state, sgState, manualPoints));

		gradingContext.lastGradedQuestionId = initialQuestion.id;
	}

	function handleRegrade() {
		if (isSubmitting || !state) return;
		// Clear current feedback state
		if (
			!state.isGradable ||
			confirm(
				'Grade this question from scratch? This will not delete feedback already submitted and saved.'
			)
		) {
			setRegradeMode(true);

			updateState(QuestionGradingState.create(question, null, sgState), false);
			updatePointsInput(pointsInput, '');
			updateCommentsTextarea(commentsTextarea, '');

			gradingContext.lastGradedQuestionId = initialQuestion.id;
		}
	}

	function reset(prompt: boolean = true) {
		if (isSubmitting || !state?.isDirty || !state.isGradable) return;
		if (prompt && !confirm('Reset to last-saved feedback?')) return;

		const lastSavedState = QuestionGradingState.create(question, savedFeedback, sgState);
		updateState(lastSavedState, false);
		restoreSGState();
		setRegradeMode(false);

		gradingContext.lastGradedQuestionId = initialQuestion.id;
	}

	function handleSubmit() {
		if (isSubmitting || !state?.isDirty || !state.isGradable) return;
		gradingContext.lastGradedQuestionId = initialQuestion.id;
		gradingContext.submitFeedback();
	}

	const setRegradeMode = useCallback((regrade: boolean) => {
		if (stateRef.isRegrading === regrade) return;
		setIsRegrading(regrade);
		stateRef.isRegrading = regrade;
	}, []);

	const saveQuestionFeedback = useCallback(async () => {
		const newSavedFeedback = QuestionGradingState.toPersistentState(
			stateRef.gradingState,
			initialQuestion.id
		);
		try {
			await sendMessageToBackground({
				command: BackgroundCommand.updateQuestionFeedbackInStore,
				quizId: initialQuiz.id,
				submissionId,
				question: {
					...(newSavedFeedback
						? { feedback: newSavedFeedback }
						: { id: initialQuestion.id }),
				},
			});
			setSavedFeedback(newSavedFeedback);
			stateRef.savedFeedback = newSavedFeedback;

			return true;
		} catch (error) {
			console.error(
				'Failed to save question feedback:',
				error instanceof Error ? error.message : 'Unknown error'
			);
			postSnackbarItem({
				title: 'Error: Save',
				message: 'Unable to save submitted feedback.',
				type: 'warning',
				timeoutMs: 3000,
			});
			return false;
		}
	}, []);

	const handleSGPointsInputChange = useCallback(() => {
		if (stateRef.gradingState) return;

		const oldSGPoints = stateRef.sgState.points;
		const { points: newSGPoints } = QuestionGradingState.createSGState(
			{ points: pointsInput.value.trim(), comments: '' },
			initialQuestion
		);
		if (
			// 1. Both are invalid or empty (ungraded)
			(!oldSGPoints && !newSGPoints) ||
			// 2. Both are nonempty and equal
			(oldSGPoints && newSGPoints && isDecimalEqual(oldSGPoints, newSGPoints))
		) {
			gradingContext.dirtyQuestions.delete(initialQuestion.id);
		} else {
			gradingContext.dirtyQuestions.add(initialQuestion.id);
		}
		gradingContext.lastGradedQuestionId = initialQuestion.id;
	}, []);

	const handleSGCommentsChange = useCallback(() => {
		if (stateRef.gradingState) return;

		const newComments = commentsTextarea.value;
		commentsTextarea.textContent = newComments;

		const oldSGComments = stateRef.sgState.comments;
		const { comments: newSGComments } = QuestionGradingState.createSGState(
			{ points: '', comments: newComments },
			initialQuestion
		);
		if (newSGComments === oldSGComments) {
			gradingContext.dirtyQuestions.delete(initialQuestion.id);
		} else {
			gradingContext.dirtyQuestions.add(initialQuestion.id);
		}
		gradingContext.lastGradedQuestionId = initialQuestion.id;
	}, []);

	const handleEndSubmitFeedback = useCallback(
		async (payload: ContentEventPayload[ContentEvent.endSubmitFeedback]) => {
			if (!payload.success) return;
			const newSGState = QuestionGradingState.createSGState(
				{ points: pointsInput.value, comments: commentsTextarea.textContent! },
				initialQuestion
			);
			setSGState(newSGState);
			stateRef.sgState = newSGState;

			if (payload.questionIds.has(initialQuestion.id)) {
				await saveQuestionFeedback();
			}

			updateState(
				QuestionGradingState.create(initialQuestion, stateRef.savedFeedback, newSGState),
				false
			);
			setRegradeMode(false);
		},
		[]
	);

	const restoreSGState = useCallback(() => {
		updatePointsInput(pointsInput, stateRef.sgState.points ?? '');
		updateCommentsTextarea(commentsTextarea, stateRef.sgState.comments);
	}, []);

	const reloadRubric = useCallback((newQuestion: IQuestion) => {
		if (gradingContext.isFeedbackSubmitting) return;

		const newState = QuestionGradingState.create(
			newQuestion,
			stateRef.savedFeedback,
			stateRef.sgState
		);
		if (newState) {
			pointsInput.readOnly = commentsTextarea.readOnly = true;
		} else {
			// No grading state, no grading box
			pointsInput.readOnly = commentsTextarea.readOnly = false;
		}
		setQuestion(newQuestion);
		updateState(newState, false);

		restoreSGState();
		setRegradeMode(false);
	}, []);

	const updateFocusState = useCallback(
		(payload: CommandMessagePayload[ContentCommand.updateFocusState]) => {
			if (
				payload.focusMode === 'select' &&
				typeof payload.target === 'object' &&
				payload.target[initialQuestion.id] === undefined
			) {
				// Not the target, no need to update visibility
				return;
			}
			const isVisible =
				payload.focusMode === 'off' ||
				(payload.focusMode === 'on' && payload.target[initialQuestion.id]) ||
				(payload.focusMode === 'select' &&
					(payload.target === 'all' ||
						(payload.target !== 'none' && payload.target[initialQuestion.id]!)));

			if (!isVisible) {
				reset(false);
			}
			setQuestionContainerVisible(questionContainer, isVisible);
			setIsContainerVisible(isVisible);
		},
		[]
	);

	useLayoutEffect(() => {
		if (state) {
			pointsInput.readOnly = commentsTextarea.readOnly = true;
		}
		setQuestionContainerVisible(questionContainer, isContainerVisible);
		if (
			appSettings.scrollToLastGradedQuestion &&
			gradingContext.lastGradedQuestionId === initialQuestion.id
		) {
			questionContainer.scrollIntoView();
		}

		pointsInput.addEventListener('input', handleSGPointsInputChange);
		commentsTextarea.addEventListener('input', handleSGCommentsChange);

		// Register event handler to save feedback to store upon successful form submission
		const removeSaveQuestionFeedbackHandler = addContentEventListener(
			ContentEvent.endSubmitFeedback,
			handleEndSubmitFeedback,
			submissionWindow
		);

		const removeCommandListener = addCommandHandler({
			[ContentCommand.reloadRubric]({ question }) {
				if (question.id !== initialQuestion.id) return;
				reloadRubric(question);
			},
			[ContentCommand.updateFocusState]: updateFocusState,
		});

		return () => {
			pointsInput.removeEventListener('input', handleSGPointsInputChange);
			commentsTextarea.removeEventListener('input', handleSGCommentsChange);
			removeSaveQuestionFeedbackHandler();
			removeCommandListener();
		};
	}, []);

	useEffect(() => {
		if (state?.isDirty) {
			gradingContext.dirtyQuestions.add(initialQuestion.id);
		} else {
			gradingContext.dirtyQuestions.delete(initialQuestion.id);
		}
	}, [state]);

	return {
		question,
		state,
		sgState,

		newManualPoints: manualPoints,
		isContainerVisible,
		isRegrading,
		isSubmitting,
		canGrade: Boolean(!isSubmitting && state?.isGradable),
		canRegrade: !isSubmitting && !isRegrading,
		canReset: Boolean(!isSubmitting && savedFeedback && state?.isGradable),
		canSubmit: Boolean(!isSubmitting && state?.isGradable && state.isDirty),

		rubricItemCanToggle,
		toggleSelectRubricItem,
		handleNewManualPointsChange,
		applyManualPoints,
		handleCommentsChange,

		handleRegrade,
		handleReset: () => reset(),
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
