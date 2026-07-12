import { secondsToMilliseconds } from 'motion/react';
import type { GradingContext } from './GradingContext';
import { ContentEvent, dispatchContentEvent } from './event';
import { postSnackbarItem } from './ui/snackbar';

export type FeedbackSubmissionStrategy = 'all' | 'focused' | 'updated';

const essentialFields = [
	'utf8',
	'_method',
	'authenticity_token',
	'override_scores',
	'headless',
	'submission_version_number',
	'fudge_points',
];

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
	if (!this.quiz) return null;

	let targetQuestions = new Set(this.dirtyQuestions);
	if (this.appSettings.feedbackSubmissionStrategy === 'focused') {
		for (const question of this.quiz.questions) {
			if (question.isFocused) continue;
			targetQuestions.delete(question.id);
		}
	}
	if (targetQuestions.size === 0) {
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
	const rawFormData = new FormData(this.submissionForm!);
	let formData = rawFormData;
	if (this.appSettings.feedbackSubmissionStrategy !== 'all') {
		formData = new FormData();
		for (const field of essentialFields) {
			const value = rawFormData.get(field);
			if (value === null) continue;
			formData.set(field, value);
		}
		for (const [questionId, field] of this.submissionFormFields.entries()) {
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
		var response = await fetch(this.submissionForm!.action, {
			method: this.submissionForm!.method,
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
			timeoutMs: secondsToMilliseconds(2),
		});
		if (navigate) {
			this.navigateSubmission(navigate, false);
		}
		for (const questionId of targetQuestions) {
			this.dirtyQuestions.delete(questionId);
		}
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
		{ success, questionIds: targetQuestions },
		this.submissionWindow!
	);

	this.isFeedbackSubmitting = false;
	return success;
}
