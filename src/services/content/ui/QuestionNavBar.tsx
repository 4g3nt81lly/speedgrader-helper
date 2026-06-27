import { useState, type MouseEvent } from 'react';
import type { IQuestion } from '~/models/Question';
import type { IQuiz } from '~/models/Quiz';
import { addContentEventListener, ContentEvent, dispatchContentEvent } from '~/shared/event';
import { BackgroundCommand, sendMessageToBackground } from '~/shared/message';

type QuestionNavBarProps = {
	quizId: IQuiz['id'];
	question: Pick<IQuestion, 'id'>;
	gradingForm: HTMLFormElement;
};

export default function QuestionNavBar(props: QuestionNavBarProps) {
	const { quizId, question, gradingForm } = props;

	const [isNavigating, setIsNavigating] = useState(false);

	async function handleNavigate(event: MouseEvent<HTMLButtonElement>) {
		if (isNavigating) return;
		setIsNavigating(true);

		// Update last-graded question before navigating
		await sendMessageToBackground(
			{ command: BackgroundCommand.updateQuizLastGradedQuestion, quizId, questionId: question.id },
			{ noThrowOnNoReceiver: true }
		);

		addContentEventListener(
			ContentEvent.gradeSubmissionComplete,
			({ success }) => {
				setIsNavigating(false);
				if (!success) return;
				const direction = (event.target as HTMLButtonElement).name as 'prev' | 'next';
				dispatchContentEvent(ContentEvent.navigateSubmission, { direction }, window.parent);
			},
			window,
			{ once: true }
		);

		gradingForm.requestSubmit();
	}

	return (
		<div className="absolute inset-0 my-2.5 flex justify-center gap-5">
			<button title="Previous" name="prev" disabled={isNavigating} onClick={handleNavigate}>
				Prev
			</button>
			<button title="Next" name="next" disabled={isNavigating} onClick={handleNavigate}>
				Next
			</button>
		</div>
	);
}
