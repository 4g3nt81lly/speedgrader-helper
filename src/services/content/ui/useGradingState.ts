import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { IQuestion } from '~/models/Question';
import {
	addContentEventListener,
	ContentEvent,
	removeContentEventListener,
} from '~/shared/event';
import {
	addMessageListener,
	BackgroundCommand,
	ContentCommand,
	sendMessageToBackground,
	type ICommandMessage,
} from '~/shared/message';
import { pushSnackbarItem } from '~/shared/utils';
import type { Nullable } from '~/types/utils';
import Selectors from '../selectors';
import type { GradingBoxProps } from './GradingBox';
import {
	QuestionGradingState,
	type DiffRubricItem,
	type IQuestionGradingState,
} from './QuestionGradingState';

export default function useGradingState(props: GradingBoxProps) {
	const {
		submissionId,
		initialQuiz,
		initialQuestion,
		initialFeedback,
		questionContainer,
		pointsInput,
		commentsTextarea,
		scrollIntoView,
	} = props;

	const [question, setQuestion] = useState(initialQuestion);

	const [savedFeedback, setSavedFeedback] = useState(initialFeedback);
	const defaultState = useMemo(
		() => QuestionGradingState.create(question, savedFeedback),
		[question, savedFeedback]
	);

	const [state, setState] = useState(defaultState);
	const stateRef = useRef(defaultState);

	const [isVisible, setIsVisible] = useState(
		!initialQuiz.focusMode || initialQuestion.isFocused
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	function updateState(
		state:
			| IQuestionGradingState
			| ((oldState: IQuestionGradingState) => IQuestionGradingState)
	) {
		setState((oldState) => {
			const newState = typeof state === 'function' ? state(oldState) : state;

			updatePointsInput(pointsInput, newState.points ?? newState.manualPoints);
			updateCommentsTextarea(
				commentsTextarea,
				QuestionGradingState.getGradingComments(newState)
			);

			stateRef.current = newState;
			return newState;
		});
	}

	function rubricItemCanToggle(rubricItem: DiffRubricItem) {
		return QuestionGradingState.checkRubricItemCanToggle(state, question, rubricItem);
	}

	function toggleSelectRubricItem(rubricItem: DiffRubricItem) {
		if (isSubmitting || state.isInvalid) return;
		if (
			state.manualPoints !== null &&
			!confirm('Apply rubric item? This will discard manual points override!')
		)
			return;

		updateState(
			QuestionGradingState.toggleSelectRubricItem(
				state,
				defaultState,
				question,
				rubricItem
			)
		);
	}

	function handleCommentsChange(event: ChangeEvent<HTMLTextAreaElement>) {
		if (isSubmitting) return;
		const comments = event.target.value;
		updateState(QuestionGradingState.updateComments(state, defaultState, comments));
	}

	function handleManualPointsChange(event: ChangeEvent<HTMLInputElement>) {
		if (isSubmitting || state.isInvalid) return;

		// If no feedback, apply manual points immediately
		// If manual points override, update its value
		// Otherwise selected rubric items present, confirm manual points override
		const manualPoints = event.target.value.trim();
		if (!manualPoints) {
			return updateState({ ...defaultState, comments: state.comments });
		}
		if (
			!state.selectedRubricItems ||
			confirm('Apply manual points? This will discard selected rubric items!')
		) {
			updateState(
				QuestionGradingState.applyManualPoints(state, defaultState, manualPoints)
			);
		}
	}

	function handleRegrade() {
		if (isSubmitting) return;
		// Clear current feedback state
		if (
			state.isInvalid ||
			confirm(
				'Grade this question from scratch? This will not delete feedback already submitted and saved.'
			)
		) {
			updateState(QuestionGradingState.create(question, null));
		}
	}

	function handleReset() {
		if (isSubmitting || !state.isDirty) return;
		// Reset to default (saved) state
		if (
			state.isInvalid ||
			confirm(
				'Reset to last-saved feedback? This has no effect if no changes were made since last save.'
			)
		) {
			updateState(defaultState);
		}
	}

	function handleSubmit() {
		if (isSubmitting || !state.isDirty) return;

		setIsSubmitting(true);
		pointsInput.form!.requestSubmit();
	}

	async function saveQuestionFeedback() {
		if (!stateRef.current.isDirty || stateRef.current.isInvalid) {
			return setIsSubmitting(false);
		}
		const newSavedFeedback = QuestionGradingState.toPersistentState(
			stateRef.current,
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
			updateState(QuestionGradingState.markAsClean(stateRef.current));
		} catch (error) {
			console.error(
				'Failed to save question feedback:',
				error instanceof Error ? error.message : 'Unknown error'
			);
			pushSnackbarItem(
				{
					title: 'Error: Save',
					message: 'Unable to save submitted feedback.',
					type: 'warning',
					timeoutMs: 3000,
				},
				'iframe'
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	function updateGradingStates(newQuestion: IQuestion) {
		updateState((oldState) => {
			// Generate serializable feedback object for current state
			const currentFeedback = QuestionGradingState.toPersistentState(
				oldState,
				newQuestion.id
			);
			// Update diff rubric items
			return QuestionGradingState.create(newQuestion, currentFeedback);
		});

		// Update current question
		setQuestion(newQuestion);
	}

	function updateFocusState(message: ICommandMessage<ContentCommand.updateFocusState>) {
		if (
			message.focusMode === 'select' &&
			typeof message.target === 'object' &&
			message.target[initialQuestion.id] === undefined
		) {
			// Not the target, no need to update visibility
			return;
		}
		const isVisible =
			message.focusMode === 'off' ||
			(message.focusMode === 'on' && message.target[initialQuestion.id]) ||
			(message.focusMode === 'select' &&
				(message.target === 'all' ||
					(message.target !== 'none' && message.target[initialQuestion.id]!)));

		setQuestionContainerVisible(questionContainer, isVisible);
		setIsVisible(isVisible);
	}

	useLayoutEffect(() => {
		if (scrollIntoView) questionContainer.scrollIntoView();

		setQuestionContainerVisible(questionContainer, isVisible);

		const formEventHandler = () => setIsSubmitting(true);
		pointsInput.form!.addEventListener('formdata', formEventHandler);

		// Register event handler to save feedback to store upon successful form submission
		const saveQuestionFeedbackHandler = addContentEventListener(
			ContentEvent.saveQuestionFeedback,
			saveQuestionFeedback
		);

		const removeMessageListener = addMessageListener(
			async (
				message:
					| ICommandMessage<ContentCommand.reinjectRubric>
					| ICommandMessage<ContentCommand.updateFocusState>
			) => {
				if (message.command === ContentCommand.reinjectRubric) {
					if (message.question.id !== initialQuestion.id) return;
					updateGradingStates(message.question);
				}

				if (message.command === ContentCommand.updateFocusState) {
					updateFocusState(message);
				}
			}
		);

		return () => {
			removeContentEventListener(
				ContentEvent.saveQuestionFeedback,
				saveQuestionFeedbackHandler
			);
			removeMessageListener();
		};
	}, []);

	return {
		question,
		state,
		savedFeedback,

		isVisible,
		isSubmitting,

		rubricItemCanToggle,
		toggleSelectRubricItem,
		handleManualPointsChange,
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

function updatePointsInput(pointsInput: HTMLInputElement, points: Nullable<string>) {
	const pointsText = points ?? pointsInput.defaultValue;
	if (pointsText === pointsInput.value) return;

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
		pointsText
	);
	// Simulate user inserting text into the input element
	pointsInput.dispatchEvent(
		new InputEvent('insertText', {
			data: pointsText,
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

function updateCommentsTextarea(
	commentsTextarea: HTMLTextAreaElement,
	comments: Nullable<string>
) {
	commentsTextarea.value = comments ?? commentsTextarea.defaultValue;
}
