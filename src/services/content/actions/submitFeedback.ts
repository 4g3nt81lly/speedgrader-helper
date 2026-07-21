import navigateSubmission from '#content/actions/navigateSubmission';
import { ContentEvent, dispatchContentEvent } from '#content/event';
import { updateGradingContext } from '#content/stores/gradingContext.actions';
import { useContentStore } from '#content/stores/main.store';
import { postSnackbarItem } from '#content/stores/snackbar.store';
import Constants from '#shared/constants';
import reloadQuiz, { quizReloadScheduled } from './reloadQuiz';
import saveFeedback from './saveFeedback';

const essentialFields = [
	'utf8',
	'_method',
	'authenticity_token',
	'override_scores',
	'headless',
	'submission_version_number',
	'fudge_points',
];

export async function submitFeedback(event?: SubmitEvent, navigate?: 'next' | 'prev') {
	const context = useContentStore.getState().gradingContext;
	if (!context) return null;

	if (context.isFeedbackSubmitting) {
		postSnackbarItem({
			title: 'Save',
			message: 'Submission in progress...',
			type: 'warning',
		});
		return null;
	}

	const appSettings = useContentStore.getState().appSettings;
	const { quiz, submissionForm, submissionFormFields, dirtyQuestions } = context;

	const targetQuestions = new Set(dirtyQuestions);
	if (appSettings.feedbackSubmissionStrategy === 'focused') {
		for (const question of quiz.questions) {
			if (question.isFocused) continue;
			targetQuestions.delete(question.id);
		}
	}
	if (targetQuestions.size === 0) {
		postSnackbarItem({ title: 'Save', message: 'Nothing to save.', type: 'success' });
		return null;
	}
	updateGradingContext({ isFeedbackSubmitting: true });

	// Prevent default form submission flow
	event?.preventDefault();
	// Prevent other submit event handlers from running
	event?.stopImmediatePropagation();
	// Prevent event handlers registered elsewhere from running
	event?.stopPropagation();

	// Manually submit using form data
	const rawFormData = new FormData(submissionForm);
	let formData = rawFormData;
	if (
		appSettings.feedbackSubmissionStrategy !== 'all' &&
		(appSettings.feedbackSubmissionStrategy !== 'focused' || quiz.focusMode)
	) {
		formData = new FormData();
		for (const field of essentialFields) {
			const value = rawFormData.get(field);
			if (value === null) continue;
			formData.set(field, value);
		}
		for (const [questionId, field] of submissionFormFields.entries()) {
			if (!targetQuestions.has(questionId)) {
				continue;
			}
			const { pointsField, commentsField } = field;
			const points = rawFormData.get(pointsField);
			const comments = rawFormData.get(commentsField);
			if (points !== null) {
				formData.set(pointsField, points);
			}
			if (comments !== null) {
				formData.set(commentsField, comments);
			}
		}
	}
	let success = false;
	try {
		var response = await fetch(submissionForm.action, {
			method: submissionForm.method,
			body: formData,
			redirect: 'follow',
		});
		success = response.ok;
	} catch (error) {
		console.error('Failed to submit form data:', error);
		postSnackbarItem({
			title: 'Save Error',
			message: 'Unable to submit feedback. Please refresh the page and try again!',
			type: 'error',
			closeReason: 'manual',
		});
	}
	if (success) {
		// Refresh grades and update stats in SpeedGrader header
		dispatchContentEvent(ContentEvent.refreshGrades, {}, window);
		postSnackbarItem({
			message: 'Successfully submitted feedback!',
			type: 'success',
			timeoutMs: 2 * Constants.SECOND_MS,
		});
		if (navigate) {
			navigateSubmission(navigate, false);
		}
		const newDirtyQuestions = new Set(dirtyQuestions);
		for (const questionId of targetQuestions) {
			newDirtyQuestions.delete(questionId);
		}
		updateGradingContext({ dirtyQuestions: newDirtyQuestions });

		await saveFeedback(targetQuestions);
	} else {
		postSnackbarItem({
			message: 'Unable to submit feedback. Please refresh the page and try again!',
			type: 'error',
			timeoutMs: 3 * Constants.SECOND_MS,
		});
	}

	updateGradingContext({ isFeedbackSubmitting: false });
	if (quizReloadScheduled) {
		reloadQuiz();
	}
	return success;
}
