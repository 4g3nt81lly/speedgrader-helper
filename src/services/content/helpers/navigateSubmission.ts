import type GradingContextActions from '#content/actions/gradingContext';
import { snackbar } from '#content/actions/snackbar';
import Selectors from '#content/selectors';
import { sendMessageToBackground } from '#shared/message';

export type NavigateSubmissionDirection = 'next' | 'prev';

export default async function navigateSubmission(
	this: GradingContextActions,
	direction: NavigateSubmissionDirection
) {
	const {
		appSettings: { defaultQuizInjector },
		gradingContext,
	} = this.state;

	// Update last-graded question before navigating
	if (typeof gradingContext?.lastGradedQuestionId === 'string') {
		await sendMessageToBackground({
			name: 'quizzes.updateLastGradedQuestion',
			quizId: gradingContext.quiz.id,
			questionId: gradingContext.lastGradedQuestionId,
		});
	}

	const navigationButton = document.querySelector<HTMLButtonElement>(
		direction === 'prev'
			? Selectors[defaultQuizInjector].PREV_STUDENT_BUTTON
			: Selectors[defaultQuizInjector].NEXT_STUDENT_BUTTON
	);
	if (!navigationButton) {
		snackbar.post({
			message: 'Unable to navigate. Please refresh the page and try again!',
			type: 'error',
		});
		return false;
	}
	navigationButton.click();
	return true;
}
