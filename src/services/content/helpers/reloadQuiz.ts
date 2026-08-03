import type GradingContextActions from '#content/actions/gradingContext';
import QuestionGradingStateActions from '#content/actions/gradingState';
import { snackbar } from '#content/actions/snackbar';
import { sendMessageToBackground } from '#shared/message';
import { reloadPage } from '#shared/utils/browser';

export default async function reloadQuiz(this: GradingContextActions) {
	const { quiz, gradingStates } = this.gradingContext;

	const newQuiz = await sendMessageToBackground({
		name: 'quizzes.getByID',
		id: quiz.id,
	}).catch((error) => {
		console.error('Failed to reload quiz:', error);
		return null;
	});
	if (!newQuiz) {
		snackbar.post({
			message: 'An error occurred while reloading rubrics, please refresh the page.',
			retry: { handler: reloadPage, tooltip: 'Reload page' },
		});
		return false;
	}

	const newQuestionMap = Object.fromEntries(
		newQuiz.questions.map((question) => [question.id, question])
	);
	const newGradingStates = { ...gradingStates };
	for (const [questionId, gradingState] of Object.entries(gradingStates)) {
		const newQuestion = newQuestionMap[questionId];
		if (newQuestion) {
			newGradingStates[questionId] = {
				...gradingState,
				question: newQuestion,
				boxState: QuestionGradingStateActions.createBoxState(
					newQuestion,
					gradingState.savedFeedback,
					gradingState.sgState
				),
				isRegrading: false,
			};
		} else {
			// TODO: do something about the case where the new quiz has question mismatch
			delete newGradingStates[questionId];
		}
	}
	this.update({ quiz: newQuiz, gradingStates: newGradingStates });

	snackbar.post({ message: 'Rubrics reloaded.', timeoutSeconds: 2 });
	return true;
}
