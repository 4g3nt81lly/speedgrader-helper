import Selectors from '#content/selectors';
import type { IQuestion } from '#models/Question';
import { isDecimalWithinRange } from '#shared/utils/decimal';
import RubricControls from './RubricControls';
import useGradingBoxState from './useGradingBoxState';

export type QuestionGradingBoxProps = {
	questionId: IQuestion['id'];
};

export default function QuestionGradingBox(props: QuestionGradingBoxProps) {
	const {
		question,
		boxState,
		lastSGState,

		newManualPoints,
		isSubmitting,
		isVisible,
		isRegrading,
		canGrade,
		canRegrade,
		canReset,
		canSubmit,

		rubricItemCanToggle,
		toggleSelectRubricItem,
		handleNewManualPointsChange,
		applyManualPoints,
		handleCommentsChange,
		handleRegrade,
		handleReset,
		handleSubmit,
	} = useGradingBoxState(props);

	return (
		isVisible &&
		boxState && (
			<div
				className={`${Selectors.app.GRADING_BOX_CLASS} mt-8 flex flex-col gap-1.5 border-[0.75px] p-5`}
			>
				<div className="flex flex-col gap-1">
					{boxState.stateDiff.points && (
						<div className="mb-2 bg-red-100 p-2 leading-tight">
							❗️ Points diverged since last graded: awarded "{boxState.points!}" previously but is
							now{' '}
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
							<blockquote className="text-sm text-gray-600">
								{boxState.stateDiff.comments}
							</blockquote>
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

				<RubricControls
					boxState={boxState}
					canGrade={canGrade}
					checkRubricItemCanToggle={rubricItemCanToggle}
					toggleRubricItemSelection={toggleSelectRubricItem}
					handleCommentsChange={handleCommentsChange}
				/>
				<hr className="my-3 w-full border-[0.5px]" />

				<div className="flex justify-between gap-2">
					{/* Left controls */}
					<div className="flex items-center">
						<label className="mr-5 flex items-center gap-1.5">
							<span>Manual Points:</span>
							<input
								type="number"
								className="h-full w-[45px] py-1 pr-1 pl-1.5"
								value={newManualPoints}
								onChange={handleNewManualPointsChange}
								max={question.points}
								min="0"
								step="0.5"
								disabled={!canGrade}
							/>
							<button
								type="button"
								className="ml-1 px-1.5 py-1"
								disabled={
									!canGrade ||
									!newManualPoints ||
									!isDecimalWithinRange(newManualPoints, 0, question.points)
								}
								onClick={applyManualPoints}
							>
								Apply
							</button>
						</label>

						<div className="flex gap-2">
							<button
								type="button"
								className="px-1.5 py-1"
								disabled={!canRegrade}
								onClick={handleRegrade}
							>
								Regrade
							</button>
							<button
								type="button"
								className="px-1.5 py-1"
								disabled={!canReset}
								onClick={handleReset}
							>
								Reset
							</button>
						</div>
					</div>

					{/* Right controls */}
					<div className="flex items-center">
						<button
							type="submit"
							className="px-1.5 py-1"
							disabled={!canSubmit}
							onClick={handleSubmit}
						>
							{isSubmitting ? 'Submitting...' : 'Submit'}
						</button>
					</div>
				</div>
			</div>
		)
	);
}
