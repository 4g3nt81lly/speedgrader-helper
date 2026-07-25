import Selectors from '#content/selectors';
import { useContentStore } from '#content/stores/main.store';
import { postSnackbarItem } from '#content/stores/snackbar.store';
import { sendMessageToBackground } from '#shared/message';
import { BackgroundCommand } from '#shared/types/message';
import { submitFeedback } from './submitFeedback';
import { restoreSGFeedback } from './updateSGInputs';

export default async function navigateSubmission(
	direction: 'next' | 'prev',
	save: boolean = true
) {
	const { appSettings, gradingContext } = useContentStore.getState();

	if (save && gradingContext && gradingContext.dirtyQuestions.size > 0) {
		submitFeedback(undefined, direction);
		return;
	}
	// Update last-graded question before navigating
	if (typeof gradingContext?.lastGradedQuestionId === 'string') {
		await sendMessageToBackground({
			command: BackgroundCommand.updateQuizLastGradedQuestion,
			quizId: gradingContext.quiz.id,
			questionId: gradingContext.lastGradedQuestionId,
		});
	}

	const navigationButton = document.querySelector<HTMLButtonElement>(
		direction === 'prev'
			? Selectors[appSettings.defaultQuizInjector].PREV_STUDENT_BUTTON
			: Selectors[appSettings.defaultQuizInjector].NEXT_STUDENT_BUTTON
	);
	if (!navigationButton) {
		return postSnackbarItem({
			message: 'Unable to navigate. Please refresh the page and try again!',
			type: 'error',
		});
	}

	// Suppress SpeedGrader's weird default behaviour (which caches unsaved feedback)
	// by restoring inputs to last submitted
	restoreSGFeedback();

	navigationButton.click();
}
