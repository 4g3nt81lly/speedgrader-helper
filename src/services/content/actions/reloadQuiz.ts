import { updateGradingContext } from '#content/stores/gradingContext.actions';
import { createQuestionGradingBoxState } from '#content/stores/gradingStates.actions';
import { useContentStore } from '#content/stores/main.store';
import { postSnackbarItem } from '#content/stores/snackbar.store';
import Constants from '#shared/constants';
import QuizLocalStore from '#shared/stores/QuizLocalStore';

export let quizReloadScheduled = false;

export default async function reloadQuiz() {
	const gradingContext = useContentStore.getState().gradingContext;
	if (!gradingContext) return;

	const { quiz, isFeedbackSubmitting } = gradingContext;
	if (isFeedbackSubmitting) {
		quizReloadScheduled = true;
		return;
	}

	const newQuiz = await QuizLocalStore.getQuizById(quiz.id).catch((error) => {
		console.error('Failed to reload quiz:', error);
		return null;
	});
	if (!newQuiz) {
		return postSnackbarItem({
			message: 'An error occurred while reloading quiz, please refresh the page.',
			closeReason: 'manual',
		});
	}

	const newQuestionMap = Object.fromEntries(
		newQuiz.questions.map((question) => [question.id, question])
	);
	const newGradingStates = { ...gradingContext.gradingStates };
	for (const [questionId, gradingState] of Object.entries(gradingContext.gradingStates)) {
		const newQuestion = newQuestionMap[questionId];
		if (newQuestion) {
			newGradingStates[questionId] = {
				...gradingState,
				question: newQuestion,
				boxState: createQuestionGradingBoxState(
					newQuestion,
					gradingState.savedFeedback,
					gradingState.sgState
				),
				isRegrading: false,
			};
		} else {
			delete newGradingStates[questionId];
		}
	}
	updateGradingContext({
		quiz: newQuiz,
		gradingStates: newGradingStates,
		dirtyQuestions: new Set(),
	});

	postSnackbarItem({ message: 'Rubrics reloaded.', timeoutMs: 2 * Constants.SECOND_MS });
}
