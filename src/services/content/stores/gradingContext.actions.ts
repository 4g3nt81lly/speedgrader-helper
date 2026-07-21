import type { IQuestion } from '#models/Question';
import type { Nullable } from '#shared/types/utils';
import { getQuestionGradingState } from './gradingStates.actions';
import { useContentStore, type GradingContext } from './main.store';

export function updateGradingContext(partial: Partial<GradingContext>) {
	if (!useContentStore.getState().gradingContext) return;
	useContentStore.setState((state) => ({
		...state,
		gradingContext: { ...state.gradingContext!, ...partial },
	}));
}

export function setLastGradedQuestion(questionId: Nullable<IQuestion['id']>) {
	updateGradingContext({ lastGradedQuestionId: questionId });
}

export function updateQuestionDirtyState(questionId: IQuestion['id'], dirty?: boolean) {
	const gradingContext = useContentStore.getState().gradingContext;
	if (!gradingContext) return;

	const { dirtyQuestions } = gradingContext;
	const newDirtyQuestions = new Set(dirtyQuestions);
	const isDirty = dirtyQuestions.has(questionId);

	if (typeof dirty !== 'boolean') {
		const state = getQuestionGradingState(questionId);
		if (!state) return;
		dirty = state.boxState?.isDirty ?? false;
	}
	if (isDirty === dirty) return;

	if (dirty) {
		newDirtyQuestions.add(questionId);
	} else {
		newDirtyQuestions.delete(questionId);
	}
	updateGradingContext({ dirtyQuestions: newDirtyQuestions });
}
