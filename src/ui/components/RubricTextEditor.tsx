import type { IQuestion } from '#models/Question';
import type { IRubric } from '#models/Rubric';
import Rubric from '#models/Rubric';
import { isDecimalGreaterThan } from '#shared/decimal';
import { Button, Checkbox, FormControl, FormHelperText, Textarea } from '@mui/joy';
import Decimal from 'decimal.js';
import { useState, type ChangeEvent } from 'react';

type RubricTextEditorProps = {
	rubric: IRubric;
	maxPoints: string;
	updateRubric(newRubric: IQuestion['rubric']): void;
};

export default function RubricTextEditor(props: RubricTextEditorProps) {
	const { rubric, maxPoints, updateRubric } = props;

	const [oldText, setOldText] = useState(() => Rubric.toText(rubric));
	const [newText, setNewText] = useState(oldText);

	function handleRevert() {
		if (!confirm('Revert to previous rubric state? Current edits will be discarded.')) return;
		setNewText(oldText);
	}

	function handleCompile() {
		if (
			rubric.items.length > 0 &&
			!confirm('Warning: This will replace the existing rubric items, continue?')
		)
			return;

		let newRubric = Rubric.fromText(newText);
		newRubric = {
			...newRubric,
			items: newRubric.items.filter((rubricItem) => {
				return !isDecimalGreaterThan(Decimal.abs(rubricItem.points), maxPoints);
			}),
		};
		updateRubric(newRubric);

		const updatedText = Rubric.toText(newRubric);
		setOldText(updatedText);
		setNewText(updatedText);
	}

	function toggleRubricGradingMode(_event: ChangeEvent<HTMLInputElement>) {
		updateRubric({
			...rubric,
			gradingMode: rubric.gradingMode === 'positive' ? 'negative' : 'positive',
		});
	}

	return (
		<div className="mt-2 mb-3 flex flex-col gap-1">
			<FormControl>
				<Textarea
					placeholder="Rubric markup"
					value={newText}
					onChange={(event) => setNewText(event.target.value)}
					minRows={3}
					autoFocus
				/>
				<FormHelperText className="mt-0">
					<ul className="pl-4">
						<li>
							Rubric item format: <code>&lt;points&gt;&emsp;&lt;description&gt;</code>
							(separated by at least one whitespace character)
							<br />
							Example: <code>+2&emsp;Correct explanation.</code>
						</li>
						<li>Each rubric item should start on a new line.</li>
						<li>
							Use "<code>\</code>" at the end of a line for multi-line description.
						</li>
						<li>Use a negative number for deduction.</li>
						<li>
							The magnitude of the points awarded/deducted must be no greater than {maxPoints}{' '}
							point(s).
						</li>
						<li>Malformed rubric items will be ignored and discarded.</li>
					</ul>
				</FormHelperText>
			</FormControl>

			<div className="flex justify-between">
				<Button variant="outlined" disabled={newText.trim() === oldText} onClick={handleRevert}>
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
