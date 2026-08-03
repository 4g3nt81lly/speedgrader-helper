import type { GradingContext } from '#content/stores/GradingContext';
import type { IQuestion } from '#models/Question';

export interface IFeedbackSubmissionStrategy {
	getFormData(context: GradingContext): readonly [FormData, Set<IQuestion['id']>];
}

export class AllStrategy implements IFeedbackSubmissionStrategy {
	getFormData(context: GradingContext) {
		return [
			new FormData(context.submissionForm),
			new Set(Object.keys(context.gradingStates)),
		] as const;
	}
}

export class FocusedStrategy implements IFeedbackSubmissionStrategy {
	getFormData(context: GradingContext) {
		if (!context.quiz.focusMode) {
			return new UpdatedStrategy().getFormData(context);
		}
		const form = context.submissionForm.cloneNode(true);

		const targetQuestions = new Set<IQuestion['id']>();
		for (const [questionId, { question, boxState }] of Object.entries(
			context.gradingStates
		)) {
			if (question.isFocused && !boxState.readOnly && boxState.isDirty) {
				targetQuestions.add(questionId);
				continue;
			}
			form.querySelector(`#${questionId}`)?.remove();
		}
		return [new FormData(form), targetQuestions] as const;
	}
}

export class UpdatedStrategy implements IFeedbackSubmissionStrategy {
	getFormData(context: GradingContext) {
		const form = context.submissionForm.cloneNode(true);

		const targetQuestions = new Set<IQuestion['id']>();
		for (const [questionId, { boxState }] of Object.entries(context.gradingStates)) {
			if (!boxState.readOnly && boxState.isDirty) {
				targetQuestions.add(questionId);
				continue;
			}
			form.querySelector(`#${questionId}`)?.remove();
		}
		return [new FormData(form), targetQuestions] as const;
	}
}
