import type { GradingContext } from '#content/stores/main.store';
import type { IQuestion } from '#models/Question';
import type { FeedbackSubmissionStrategy } from '#shared/types/strategy';

export interface IFeedbackSubmissionStrategy {
	getFormData(gradingContext: GradingContext): readonly [FormData, Set<IQuestion['id']>];
}

class AllStrategy implements IFeedbackSubmissionStrategy {
	getFormData(gradingContext: GradingContext) {
		return [
			new FormData(gradingContext.submissionForm),
			new Set(Object.keys(gradingContext.gradingStates)),
		] as const;
	}
}

class FocusedStrategy implements IFeedbackSubmissionStrategy {
	getFormData(gradingContext: GradingContext) {
		if (!gradingContext.quiz.focusMode) {
			return new UpdatedStrategy().getFormData(gradingContext);
		}
		const form = gradingContext.submissionForm.cloneNode(true);

		const targetQuestions = new Set<IQuestion['id']>();
		for (const [questionId, gradingState] of Object.entries(
			gradingContext.gradingStates
		)) {
			if (
				gradingState.question.isFocused &&
				gradingContext.dirtyQuestions.has(questionId)
			) {
				targetQuestions.add(questionId);
				continue;
			}
			form.querySelector(`#${questionId}`)?.remove();
		}
		return [new FormData(form), targetQuestions] as const;
	}
}

class UpdatedStrategy implements IFeedbackSubmissionStrategy {
	getFormData(gradingContext: GradingContext) {
		const form = gradingContext.submissionForm.cloneNode(true);

		for (const questionId of Object.keys(gradingContext.gradingStates)) {
			if (gradingContext.dirtyQuestions.has(questionId)) continue;

			form.querySelector(`#${questionId}`)?.remove();
		}
		return [new FormData(form), new Set(gradingContext.dirtyQuestions)] as const;
	}
}

export const feedbackSubmissionStrategies: Record<
	FeedbackSubmissionStrategy,
	new () => IFeedbackSubmissionStrategy
> = {
	all: AllStrategy,
	focused: FocusedStrategy,
	updated: UpdatedStrategy,
};
