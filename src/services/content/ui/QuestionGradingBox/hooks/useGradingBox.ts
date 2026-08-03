import { writeSGState } from '#content/helpers/updateSGInputs';
import Selectors from '#content/selectors';
import { store } from '#content/stores';
import { useGradingContext } from '#content/stores/GradingContext';
import { useQuestionGradingState } from '#content/stores/QuestionGradingState';
import type { IQuestion } from '#models/Question';
import { useLayoutEffect } from 'react';

export default function useGradingBox(questionId: IQuestion['id']) {
	const focusMode = useGradingContext((context) => context.quiz.focusMode);
	const {
		question,
		sgState: lastSGState,
		sgElements,
	} = useQuestionGradingState(questionId);
	const { container: questionContainer, pointsInput, commentsTextarea } = sgElements;

	const isVisible = !focusMode || question.isFocused;

	useLayoutEffect(() => {
		pointsInput.readOnly = commentsTextarea.readOnly = true;

		const { appSettings, gradingContext } = store.state;
		if (
			appSettings.scrollToLastGradedQuestion &&
			gradingContext?.lastGradedQuestionId === questionId
		) {
			questionContainer.scrollIntoView();
		}
	}, []);

	useLayoutEffect(() => {
		writeSGState(sgElements, lastSGState);
	}, [question]);

	useLayoutEffect(() => {
		setQuestionContainerVisible(questionContainer, isVisible);
	}, [isVisible]);

	return { isVisible };
}

function setQuestionContainerVisible(questionContainer: HTMLElement, visible: boolean) {
	if (visible) {
		questionContainer.classList.remove(Selectors.app.HIDDEN_QUESTION_CLASS);
	} else {
		questionContainer.classList.add(Selectors.app.HIDDEN_QUESTION_CLASS);
	}
}
