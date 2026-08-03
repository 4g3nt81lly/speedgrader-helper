import type { IQuestion } from '#models/Question';
import { isDecimalWithinRange } from '#shared/utils/decimal';
import useActionBar from './hooks/useActionBar';
import StatusChip from './StatusChip';

type ActionBarProps = {
	questionId: IQuestion['id'];
};

export default function ActionBar({ questionId }: ActionBarProps) {
	const {
		question,
		newManualPoints,
		isSubmitting,
		canGrade,
		canRegrade,
		canReset,
		canSubmit,
		handleNewManualPointsChange,
		applyManualPoints,
		handleRegrade,
		handleReset,
		handleSubmit,
	} = useActionBar(questionId);

	return (
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
					<button type="button" className="px-1.5 py-1" disabled={!canReset} onClick={handleReset}>
						Reset
					</button>
				</div>
			</div>

			{/* Right controls */}
			<div className="flex items-center gap-3">
				{canSubmit && <StatusChip label="Unsaved" type="warning" />}
				<button type="submit" className="px-1.5 py-1" disabled={!canSubmit} onClick={handleSubmit}>
					{isSubmitting ? 'Submitting...' : 'Submit'}
				</button>
			</div>
		</div>
	);
}
