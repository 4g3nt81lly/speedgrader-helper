import { BackgroundCommand, sendMessageToBackground } from '#shared/message';
import { ContentEvent, dispatchContentEvent } from './event';
import type { GradingContext } from './GradingContext';

export default async function navigateSubmission(
	this: GradingContext,
	direction: 'next' | 'prev',
	save: boolean = true
) {
	if (save && this.dirtyQuestions.size > 0) {
		this.submitFeedback(undefined, direction);
		return;
	}
	// Update last-graded question before navigating
	if (this.lastGradedQuestionId) {
		await sendMessageToBackground({
			command: BackgroundCommand.updateQuizLastGradedQuestion,
			quizId: this.quiz!.id,
			questionId: this.lastGradedQuestionId,
		});
	}
	dispatchContentEvent(ContentEvent.navigateSubmission, { direction }, window);
}
