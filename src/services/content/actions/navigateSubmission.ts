import { ContentEvent, dispatchContentEvent } from '#content/event';
import { useContentStore } from '#content/stores/main.store';
import { sendMessageToBackground } from '#shared/message';
import { BackgroundCommand } from '#shared/types/message';
import { submitFeedback } from './submitFeedback';

export default async function navigateSubmission(
	direction: 'next' | 'prev',
	save: boolean = true
) {
	const { appSettings, gradingContext } = useContentStore.getState();
	if (!gradingContext) return;

	if (save && gradingContext.dirtyQuestions.size > 0) {
		submitFeedback(undefined, direction);
		return;
	}
	// Update last-graded question before navigating
	if (gradingContext.lastGradedQuestionId) {
		await sendMessageToBackground({
			command: BackgroundCommand.updateQuizLastGradedQuestion,
			quizId: gradingContext.quiz.id,
			questionId: gradingContext.lastGradedQuestionId,
		});
	}
	dispatchContentEvent(
		ContentEvent.navigateSubmission,
		{ direction, injector: appSettings.defaultQuizInjector },
		window
	);
}
