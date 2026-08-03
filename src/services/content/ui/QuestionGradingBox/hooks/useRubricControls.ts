import QuestionGradingStateActions from '#content/actions/gradingState';
import { store } from '#content/stores';
import { useGradingContext } from '#content/stores/GradingContext';
import {
	useQuestionGradingState,
	type DiffRubricItem,
} from '#content/stores/QuestionGradingState';
import type { IQuestion } from '#models/Question';
import type { ChangeEvent } from 'react';

export default function useRubricControls(questionId: IQuestion['id']) {
	const boxState = useQuestionGradingState(questionId, 'boxState');
	const isSubmitting = useGradingContext('isFeedbackSubmitting');

	const stateActions = store.useActions(QuestionGradingStateActions, questionId);

	const canGrade = !isSubmitting && !boxState.readOnly;

	function checkRubricItemCanToggle(item: DiffRubricItem) {
		return canGrade && stateActions.checkRubricItemCanToggle(item);
	}

	function toggleRubricItemSelection(item: DiffRubricItem) {
		canGrade && stateActions.toggleSelectRubricItem(item);
	}

	function handleCommentsChange(event: ChangeEvent<HTMLTextAreaElement>) {
		canGrade && stateActions.setComments(event.target.value);
	}

	return {
		boxState,
		canGrade,
		checkRubricItemCanToggle,
		toggleRubricItemSelection,
		handleCommentsChange,
	};
}
