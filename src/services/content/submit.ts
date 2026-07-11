import { secondsToMilliseconds } from 'motion/react';
import type { GradingContext } from './GradingContext';
import { ContentEvent, dispatchContentEvent } from './event';
import { postSnackbarItem } from './ui/snackbar';

export async function submitFeedback(
	this: GradingContext,
	event?: SubmitEvent,
	navigate?: 'next' | 'prev'
) {
	if (this.isFeedbackSubmitting) {
		postSnackbarItem({
			title: 'Save',
			message: 'Submission in progress...',
			type: 'warning',
		});
		return null;
	}
	if (this.dirtyQuestions.size === 0) {
		postSnackbarItem({ title: 'Save', message: 'Nothing to save.', type: 'success' });
		return null;
	}
	this.isFeedbackSubmitting = true;
	dispatchContentEvent(ContentEvent.beginSubmitFeedback, {}, this.submissionWindow!);

	// Prevent default form submission flow
	event?.preventDefault();
	// Prevent other submit event handlers from running
	event?.stopImmediatePropagation();
	// Prevent event handlers registered elsewhere from running
	event?.stopPropagation();

	// Manually submit using form data
	let success = false;
	try {
		var response = await fetch(this.submissionForm!.action, {
			method: this.submissionForm!.method,
			body: new FormData(this.submissionForm!),
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
	const questionIds = new Set(this.dirtyQuestions);
	if (success) {
		// Refresh grades and update stats in SpeedGrader header
		dispatchContentEvent(ContentEvent.refreshGrades, {}, window);
		postSnackbarItem({
			message: 'Successfully submitted feedback!',
			type: 'success',
			timeoutMs: secondsToMilliseconds(2),
		});
		if (navigate) {
			this.navigateSubmission(navigate, false);
		}
		this.dirtyQuestions.clear();
	} else {
		postSnackbarItem({
			message: 'Unable to submit feedback. Please refresh the page and try again!',
			type: 'error',
			timeoutMs: secondsToMilliseconds(3),
		});
	}
	// Notify whomever might be interested in this event
	dispatchContentEvent(
		ContentEvent.endSubmitFeedback,
		{ success, questionIds },
		this.submissionWindow!
	);

	this.isFeedbackSubmitting = false;
	return success;
}
