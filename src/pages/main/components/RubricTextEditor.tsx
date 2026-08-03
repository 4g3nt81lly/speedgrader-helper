import type { IQuestion } from '#models/Question';
import type { IRubric } from '#models/Rubric';
import Rubric from '#models/Rubric';
import { isDecimalGreaterThan } from '#shared/utils/decimal';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Button, Checkbox, FormControl, FormHelperText, Textarea, Typography } from '@mui/joy';
import Decimal from 'decimal.js';
import { useMemo, useState, type ChangeEvent } from 'react';

type RubricTextEditorProps = {
	rubric: IRubric;
	maxPoints: string;
	updateRubric(newRubric: IQuestion['rubric']): void;
};

export default function RubricTextEditor(props: RubricTextEditorProps) {
	const { rubric, maxPoints, updateRubric } = props;

	const [oldText, setOldText] = useState(() => Rubric.toText(rubric));
	const [newText, setNewText] = useState(oldText);

	const rubricText = useMemo(() => Rubric.toText(rubric), [rubric]);
	const changedSinceLastSaved = useMemo(() => rubricText !== oldText, [rubricText, oldText]);

	function handleRevert() {
		if (!confirm('Discard edits to revert to previous rubric?')) return;
		if (changedSinceLastSaved) {
			setOldText(rubricText);
			setNewText(rubricText);
		} else {
			setNewText(oldText);
		}
	}

	function handleCompile() {
		let newRubric = Rubric.fromText(newText, rubric);
		newRubric = Rubric.updateItems(
			newRubric,
			newRubric.items.filter((item) => !isDecimalGreaterThan(Decimal.abs(item.points), maxPoints))
		);
		updateRubric(newRubric);

		const updatedText = Rubric.toText(newRubric);
		setOldText(updatedText);
		setNewText(updatedText);
	}

	function toggleRubricGradingMode(_event: ChangeEvent<HTMLInputElement>) {
		updateRubric(Rubric.toggleGradingMode(rubric));
	}

	return (
		<div className="mt-2 mb-3 flex flex-col gap-1">
			<FormControl color={changedSinceLastSaved ? 'warning' : 'neutral'}>
				<Textarea
					placeholder="Rubric markup"
					className="font-mono text-sm"
					value={newText}
					onChange={(event) => setNewText(event.target.value)}
					minRows={3}
					autoFocus
				/>
				{changedSinceLastSaved && (
					<FormHelperText className="mt-2 flex items-start gap-1">
						<WarningAmberIcon />
						Rubric was modified elsewhere, current text content may be stale. Use "Revert" to
						discard edits and sync.
					</FormHelperText>
				)}
			</FormControl>
			<Typography component="div" level="body-sm" color="neutral">
				<ul className="mt-1 pl-4">
					<li>
						Format: <code>&lt;index&gt;. (&lt;points&gt;)&emsp;&lt;description&gt;</code>
						<br />
						Example: <code>1.&thinsp;(+2)&thinsp;Correct answer</code>
					</li>
					<li>
						The index is a transient ID used to identify rubric items. Each rubric item should start
						on a new line with a <em>unique</em> index.
					</li>
					<li>
						Rubric items are <strong>ordered by lines</strong>, not by the index.
					</li>
					<li>
						Use "<code>\</code>" at the end of a line for multi-line description.
					</li>
					<li>
						The magnitude of the points awarded/deducted must be no greater than {maxPoints}{' '}
						point(s).
					</li>
					<li>Careful, malformed rubric items will be ignored and discarded!</li>
				</ul>
			</Typography>

			<div className="flex justify-between">
				<Button
					variant="outlined"
					disabled={!changedSinceLastSaved && newText.trim() === oldText}
					onClick={handleRevert}
				>
					Revert
				</Button>
				<Checkbox
					label="Negative grading"
					checked={rubric.gradingMode === 'negative'}
					size="sm"
					onChange={toggleRubricGradingMode}
					className="items-center px-2"
				/>
				<Button disabled={newText.trim() === oldText} onClick={handleCompile}>
					Compile
				</Button>
			</div>
		</div>
	);
}
