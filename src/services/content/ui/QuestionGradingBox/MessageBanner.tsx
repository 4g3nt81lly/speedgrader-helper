import { useQuestionGradingState } from '#content/stores/QuestionGradingState';
import type { IQuestion } from '#models/Question';

type MessageBannerProps = {
	questionId: IQuestion['id'];
};

export default function MessageBanner({ questionId }: MessageBannerProps) {
	const boxState = useQuestionGradingState(questionId, 'boxState');
	const lastSGState = useQuestionGradingState(questionId, 'sgState');
	const isRegrading = useQuestionGradingState(questionId, 'isRegrading');

	return (
		<div className="flex flex-col gap-1">
			{boxState.stateDiff.points && (
				<div className="mb-2 bg-red-100 p-2 leading-tight">
					❗️ Points diverged since last graded: awarded "{boxState.points!}" previously but is now{' '}
					{lastSGState.points
						? `"${lastSGState.points}"`
						: lastSGState.points === null
							? 'invalid'
							: 'ungraded'}
					.
				</div>
			)}
			{boxState.stateDiff.comments !== null && (
				<div className="mb-2 bg-red-100 p-2 leading-tight">
					❗️ Comments diverged since last graded. Comments submitted and saved previously:
					<blockquote className="text-sm text-gray-600">{boxState.stateDiff.comments}</blockquote>
					{lastSGState.comments ? (
						<>
							Comments in SpeedGrader:
							<blockquote className="text-sm text-gray-600">{lastSGState.comments}</blockquote>
						</>
					) : (
						'But no comments in SpeedGrader.'
					)}
				</div>
			)}
			{!isRegrading && boxState.message && (
				<div className="mb-2 bg-blue-100 p-2 leading-snug">{boxState.message}</div>
			)}
		</div>
	);
}
