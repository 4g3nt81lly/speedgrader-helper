import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { QuestionFeedback } from '~/models/Feedback';
import type { IQuestion } from '~/models/Question';
import type { IQuiz } from '~/models/Quiz';
import { addContentEventListener, ContentEvent, removeContentEventListener } from '~/shared/event';
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
import {
	QuestionGradingState,
	type DiffRubricItem,
	type IQuestionGradingState,
} from './QuestionGradingState';
import RubricControls from './RubricControls';

export type GradingBoxProps = {
	submissionId: string;
	initialQuiz: IQuiz;
	initialQuestion: IQuestion;
	initialFeedback: Nullable<QuestionFeedback>;

	questionContainer: HTMLElement;
	pointsInput: HTMLInputElement;
	commentsTextarea: HTMLTextAreaElement;

	scrollIntoView: boolean;
};

export default function GradingBox(props: GradingBoxProps) {
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

	const [isVisible, setIsVisible] = useState(!initialQuiz.focusMode || question.isFocused);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function saveFeedback(feedback: Nullable<QuestionFeedback>) {
		return sendMessageToBackground({
			command: BackgroundCommand.updateQuestionFeedbackInStore,
			quizId: initialQuiz.id,
			submissionId,
			question: { ...(feedback ? { feedback } : { id: initialQuestion.id }) },
		});
	}

	function updateState(
		state: IQuestionGradingState | ((oldState: IQuestionGradingState) => IQuestionGradingState)
	) {
		setState((oldState) => {
			const newState = typeof state === 'function' ? state(oldState) : state;

			updatePointsInput(pointsInput, newState.points ?? newState.manualPoints);
			updateCommentsTextarea(commentsTextarea, QuestionGradingState.getGradingComments(newState));

			stateRef.current = newState;
			return newState;
		});
	}

	function checkRubricItemCanToggle(rubricItem: DiffRubricItem) {
		return QuestionGradingState.checkRubricItemCanToggle(state, question, rubricItem);
	}

	function handleToggleRubricItemSelection(rubricItem: DiffRubricItem) {
		if (isSubmitting || state.isInvalid) return;
		if (
			state.manualPoints === null ||
			confirm('Apply rubric item? This will discard manual points override!')
		) {
			updateState(
				QuestionGradingState.toggleSelectRubricItem(state, defaultState, question, rubricItem)
			);
		}
	}

	function handleUpdateComments(comments: string) {
		if (isSubmitting) return;
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
			updateState(QuestionGradingState.applyManualPoints(state, defaultState, manualPoints));
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

	useLayoutEffect(() => {
		if (scrollIntoView) questionContainer.scrollIntoView();

		updateContainerVisibility(questionContainer, isVisible);

		const formEventHandler = () => setIsSubmitting(true);
		pointsInput.form!.addEventListener('formdata', formEventHandler);

		const saveQuestionFeedbackHandler = addContentEventListener(
			ContentEvent.saveQuestionFeedback,
			() => {
				// Form successfully submitted, save feedback to store iff dirty and valid
				if (!stateRef.current.isDirty || stateRef.current.isInvalid) {
					return setIsSubmitting(false);
				}

				const newSavedFeedback = QuestionGradingState.toPersistentState(
					stateRef.current,
					initialQuestion.id
				);
				saveFeedback(newSavedFeedback)
					.then(() => {
						setSavedFeedback(newSavedFeedback);
						updateState(QuestionGradingState.markAsClean(stateRef.current));
					})
					.catch((error) => {
						console.error('Failed to save question feedback:', error.message);
						pushSnackbarItem(
							{
								title: 'Error: Save',
								message: 'Unable to save submitted feedback.',
								type: 'warning',
								timeoutMs: 3000,
							},
							'iframe'
						);
					})
					.finally(() => setIsSubmitting(false));
			}
		);

		const removeMessageListener = addMessageListener(
			async (
				message:
					| ICommandMessage<ContentCommand.reinjectRubric>
					| ICommandMessage<ContentCommand.updateFocusState>
			) => {
				if (message.command === ContentCommand.reinjectRubric) {
					if (message.question.id !== initialQuestion.id) return;
					const newQuestion = message.question;

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

				if (message.command === ContentCommand.updateFocusState) {
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

					updateContainerVisibility(questionContainer, isVisible);
					setIsVisible(isVisible);
				}
			}
		);

		return () => {
			removeContentEventListener(ContentEvent.saveQuestionFeedback, saveQuestionFeedbackHandler);
			removeMessageListener();
		};
	}, []);

	return (
		isVisible && (
			<div
				className={`${Selectors.app.GRADING_BOX_CLASS} mt-8 flex flex-col gap-1.5 border-[0.75px] p-5`}
			>
				{state.isInvalid && (
					<div className="mb-2 bg-red-200 p-2 leading-snug">
						❗️ Rubric has been updated and your{' '}
						{initialFeedback === null
							? 'tentative (not submitted) feedback is no longer valid. '
							: 'most-recent submitted feedback is no longer valid.'}{' '}
						For reference, the invalid feedback is kept below. Please regrade this question.
					</div>
				)}

				<RubricControls
					gradingState={state}
					isSubmitting={isSubmitting}
					checkRubricItemCanToggle={checkRubricItemCanToggle}
					toggleRubricItemSelection={handleToggleRubricItemSelection}
					updateComments={handleUpdateComments}
				/>
				<hr className="my-3 w-full border-[0.5px]" />

				<div className="flex justify-between gap-2">
					{/* Left controls */}
					<div className="flex items-center">
						<label className="mr-5 flex gap-1.5">
							<span>Manual Points:</span>
							<input
								type="number"
								className="h-full w-[45px] py-1 pr-1 pl-1.5"
								value={state.manualPoints ?? ''}
								onChange={handleManualPointsChange}
								max={question.points}
								min="0"
								step="0.5"
								disabled={isSubmitting || state.isInvalid}
							/>
						</label>

						<div className="flex gap-2">
							<button
								type="button"
								className="px-1.5 py-1"
								disabled={isSubmitting}
								onClick={handleRegrade}
							>
								Regrade
							</button>
							<button
								type="button"
								className="px-1.5 py-1"
								disabled={isSubmitting || !savedFeedback}
								onClick={handleReset}
							>
								Reset
							</button>
						</div>
					</div>

					{/* Right controls */}
					<button
						type="submit"
						className="px-1.5 py-1"
						disabled={isSubmitting || !state.isDirty || state.isInvalid}
						onClick={handleSubmit}
					>
						{isSubmitting ? 'Submitting...' : 'Submit'}
					</button>
				</div>
			</div>
		)
	);
}

function updateContainerVisibility(questionContainer: HTMLElement, visible: boolean) {
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

function updateCommentsTextarea(commentsTextarea: HTMLTextAreaElement, comments: Nullable<string>) {
	commentsTextarea.value = comments ?? commentsTextarea.defaultValue;
}
