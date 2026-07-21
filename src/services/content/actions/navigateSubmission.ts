import { ContentEvent, dispatchContentEvent } from '#content/event';
import { useContentStore } from '#content/stores/main.store';
import { sendMessageToBackground } from '#shared/message';
import { BackgroundCommand } from '#shared/types/message';
import { submitFeedback } from './submitFeedback';

export default async function navigateSubmission(
	direction: 'next' | 'prev',
	save: boolean = true
) {
	const context = useContentStore.getState().gradingContext;
	if (!context) return;

	if (save && context.dirtyQuestions.size > 0) {
		submitFeedback(undefined, direction);
		return;
	}
	// Update last-graded question before navigating
	if (context.lastGradedQuestionId) {
		await sendMessageToBackground({
			command: BackgroundCommand.updateQuizLastGradedQuestion,
			quizId: context.quiz.id,
			questionId: context.lastGradedQuestionId,
		});
	}
	dispatchContentEvent(ContentEvent.navigateSubmission, { direction }, window);
}
