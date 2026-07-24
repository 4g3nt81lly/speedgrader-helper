import navigateSubmission from '#content/actions/navigateSubmission';
import { setLastGradedQuestion } from '#content/stores/gradingContext.actions';
import { useGradingContext } from '#content/stores/main.store';
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

		setLastGradedQuestion(questionId);
		navigateSubmission((event.target as HTMLButtonElement).name as 'prev' | 'next');
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
