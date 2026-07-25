import navigateSubmission from '#content/actions/navigateSubmission';
import { ContentEvent, dispatchContentEvent } from '#content/event';
import { feedbackSubmissionStrategies } from '#content/modules/FeedbackSubmissionStrategy';
import { updateGradingContext } from '#content/stores/gradingContext.actions';
import { useContentStore } from '#content/stores/main.store';
import { postSnackbarItem } from '#content/stores/snackbar.store';
import saveFeedback from './saveFeedback';

export async function submitFeedback(event?: SubmitEvent, navigate?: 'next' | 'prev') {
	const { gradingContext, appSettings } = useContentStore.getState();
	if (!gradingContext) return null;

	// Prevent default form submission flow
	event?.preventDefault();
	// Prevent other submit event handlers from running
	event?.stopImmediatePropagation();
	// Prevent event handlers registered elsewhere from running
	event?.stopPropagation();

	if (gradingContext.isFeedbackSubmitting) {
		postSnackbarItem({
			title: 'Save',
			message: 'Submission in progress...',
			type: 'warning',
			timeoutSeconds: 2,
		});
		return null;
	}

	const strategy = new feedbackSubmissionStrategies[
		appSettings.feedbackSubmissionStrategy
	]();
	const [formData, targetQuestions] = strategy.getFormData(gradingContext);

	if (targetQuestions.size === 0) {
		postSnackbarItem({
			title: 'Save',
			message: 'Nothing to save.',
			type: 'success',
			timeoutSeconds: 2,
		});
		return null;
	}
	console.info(
		`Submitting feedback for ${[...targetQuestions].join(', ')}:`,
		Object.fromEntries(formData.entries())
	);
	updateGradingContext({ isFeedbackSubmitting: true });

	const { submissionForm, dirtyQuestions } = gradingContext;
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
	}
	if (success) {
		// Refresh grades and update stats in SpeedGrader header
		dispatchContentEvent(ContentEvent.refreshGrades, {}, window);
		postSnackbarItem({
			message: 'Successfully submitted feedback!',
			type: 'success',
			timeoutSeconds: 2,
		});
		const newDirtyQuestions = new Set(dirtyQuestions);
		for (const questionId of targetQuestions) {
			newDirtyQuestions.delete(questionId);
		}
		updateGradingContext({ dirtyQuestions: newDirtyQuestions });

		const saveSuccess = await saveFeedback(targetQuestions);
		if (navigate && saveSuccess) {
			navigateSubmission(navigate, false);
		}
	} else {
		postSnackbarItem({
			message: 'Unable to submit feedback. Please retry or refresh the page.',
			type: 'error',
			retry: { handler: () => submitFeedback(event, navigate) },
		});
	}

	updateGradingContext({ isFeedbackSubmitting: false });
	return success;
}
