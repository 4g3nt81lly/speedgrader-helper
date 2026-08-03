import actions from '#content/actions';
import type { NavigateSubmissionDirection } from '#content/helpers/navigateSubmission';
import { useGradingContext } from '#content/stores/GradingContext';
import type { IQuestion } from '#models/Question';
import { useState, type MouseEvent } from 'react';

type QuestionNavBarProps = {
	questionId: IQuestion['id'];
};

export default function QuestionNavBar(props: QuestionNavBarProps) {
	const { questionId } = props;

	const isSubmitting = useGradingContext('isFeedbackSubmitting');
	const [canNavigate, setCanNavigate] = useState(true);

	function handleNavigate(event: MouseEvent<HTMLButtonElement>) {
		if (!canNavigate || isSubmitting) return;
		setCanNavigate(false);

		actions.gradingContext.setLastGradedQuestion(questionId);
		actions.gradingContext.submitFeedbackAndNavigate(
			(event.target as HTMLButtonElement).name as NavigateSubmissionDirection
		);
	}

	return (
		<div className="absolute inset-0 mx-auto my-2.5 flex w-fit justify-center gap-5">
			<button
				title="Previous"
				name="prev"
				disabled={!canNavigate || isSubmitting}
				onClick={handleNavigate}
			>
				Prev
			</button>
			<button
				title="Next"
				name="next"
				disabled={!canNavigate || isSubmitting}
				onClick={handleNavigate}
			>
				Next
			</button>
		</div>
	);
}
