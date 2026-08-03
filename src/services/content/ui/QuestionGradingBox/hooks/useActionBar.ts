import actions from '#content/actions';
import QuestionGradingStateActions from '#content/actions/gradingState';
import { store } from '#content/stores';
import { useGradingContext } from '#content/stores/GradingContext';
import { useQuestionGradingState } from '#content/stores/QuestionGradingState';
import type { IQuestion } from '#models/Question';
import { isDecimal, isDecimalWithinRange } from '#shared/utils/decimal';
import { useLayoutEffect, useState, type ChangeEvent } from 'react';

export default function useActionBar(questionId: IQuestion['id']) {
	const { question, boxState, isRegrading } = useQuestionGradingState(questionId);
	const isSubmitting = useGradingContext('isFeedbackSubmitting');

	const contextActions = actions.gradingContext;
	const stateActions = store.useActions(QuestionGradingStateActions, questionId);

	const [manualPoints, setManualPoints] = useState('');

	const canGrade = !isSubmitting && !boxState.readOnly;
	const canRegrade = !isSubmitting && boxState.readOnly && !isRegrading;
	const canReset = !isSubmitting && (boxState.isDirty || isRegrading);
	const canSubmit = canGrade && boxState.isDirty;

	function handleNewManualPointsChange(event: ChangeEvent<HTMLInputElement>) {
		if (!canGrade) return;
		setManualPoints(event.target.value);
		contextActions.setLastGradedQuestion(questionId);
	}

	function applyManualPoints() {
		if (!canGrade) return;
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

		stateActions.setManualPoints(manualPoints);
	}

	function handleRegrade() {
		if (
			!canRegrade ||
			!confirm(
				'Grade this question from scratch? This will not delete feedback already submitted and saved.'
			)
		)
			return;

		stateActions.beginRegrade();
		setManualPoints('');
	}

	function handleReset() {
		if (!canReset || !confirm('Reset to last-saved feedback?')) return;

		stateActions.resetBoxState();
		setManualPoints('');
	}

	function handleSubmit() {
		if (!canSubmit) return;

		setManualPoints('');
		contextActions.setLastGradedQuestion(questionId);
		contextActions.submitAndSaveFeedback();
	}

	useLayoutEffect(() => setManualPoints(''), [question]);

	return {
		question,
		newManualPoints: manualPoints,
		isSubmitting,
		canGrade,
		canRegrade,
		canReset,
		canSubmit,
		handleNewManualPointsChange,
		applyManualPoints,
		handleRegrade,
		handleReset,
		handleSubmit,
	};
}
