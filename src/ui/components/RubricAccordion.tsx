import type { IQuestion } from '#models/Question';
import Rubric from '#models/Rubric';
import { inOutTransitionMotionProps } from '#shared/animation';
import Constants from '#shared/constants';
import { defaultAppSettings } from '#shared/settings';
import type { SetNonNullable } from '#shared/types/utils';
import { useMainSelector } from '#sidepanel/pages/main/stores/main.store';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TuneIcon from '@mui/icons-material/Tune';
import { Button, Chip, IconButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/joy';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type MouseEvent } from 'react';
import Accordion from './Accordion';
import RubricListEditor from './RubricListEditor';
import RubricTextEditor from './RubricTextEditor';

type RubricAccordionProps = {
	question: IQuestion;
	updateQuestion(newQuestion: IQuestion): void;
};

export default function RubricAccordion(props: RubricAccordionProps) {
	const { question, updateQuestion } = props;
	const appSettings = useMainSelector('settings');

	function updateRubric(newRubric: IQuestion['rubric']) {
		updateQuestion!({ ...question, rubric: newRubric });
	}

	function handleAddRubric(_event: MouseEvent<HTMLButtonElement>) {
		updateRubric(Rubric.create({ gradingMode: appSettings.defaultGradingMode }));
	}

	return (
		<Accordion
			summary={
				<Typography
					level="body-md"
					fontWeight={500}
					component="span"
					className="ml-1 flex items-center"
				>
					Rubric&ensp;<Chip size="sm">{question.rubric?.items.length ?? 0}</Chip>
				</Typography>
			}
		>
			<AnimatePresence mode="popLayout">
				{question.rubric ? (
					<motion.div
						key="rubricEditor"
						layout="size"
						{...inOutTransitionMotionProps({ opacity: [0, 1] })}
					>
						<RubricEditor
							question={question as SetNonNullable<IQuestion, 'rubric'>}
							defaultRubricEditor={
								appSettings.defaultRubricEditor ?? defaultAppSettings.defaultRubricEditor
							}
							updateRubric={updateRubric}
						/>
					</motion.div>
				) : (
					<motion.div
						key="addRubricButton"
						layout="position"
						{...inOutTransitionMotionProps({ opacity: [0, 1] })}
					>
						<Button variant="plain" fullWidth onClick={handleAddRubric}>
							Add rubric
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</Accordion>
	);
}

export type RubricEditorType = 'list' | 'text';

type RubricEditorProps = {
	question: SetNonNullable<IQuestion, 'rubric'>;
	defaultRubricEditor: RubricEditorType;
	updateRubric(newRubric: IQuestion['rubric']): void;
};

function RubricEditor({ question, defaultRubricEditor, updateRubric }: RubricEditorProps) {
	const [editorType, setEditorType] = useState<RubricEditorType>(defaultRubricEditor);

	return (
		<>
			<AnimatePresence mode="wait">
				{editorType === 'list' ? (
					<motion.div
						key={editorType}
						layout="position"
						{...inOutTransitionMotionProps({ opacity: [0, 1] })}
					>
						<RubricListEditor
							rubric={question.rubric}
							maxPoints={question.points}
							updateRubric={updateRubric}
						/>
					</motion.div>
				) : (
					<motion.div
						key={editorType}
						layout="position"
						{...inOutTransitionMotionProps({ opacity: [0, 1] })}
					>
						<RubricTextEditor
							rubric={question.rubric}
							maxPoints={question.points}
							updateRubric={updateRubric}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			<motion.div layout="position">
				<RubricEditorSelector editorType={editorType} setEditorType={setEditorType} />
			</motion.div>
		</>
	);
}

export function RubricEditorSelector({
	editorType,
	setEditorType,
}: {
	editorType: RubricEditorType;
	setEditorType(editorType: RubricEditorType): void;
}) {
	return (
		<ToggleButtonGroup
			value={editorType}
			onChange={(_, newValue) => newValue && setEditorType(newValue)}
		>
			<Tooltip title="List Editor" placement="bottom" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
				<IconButton value="list" size="sm">
					<TuneIcon fontSize="small" />
				</IconButton>
			</Tooltip>
			<Tooltip title="Text Editor" placement="bottom" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
				<IconButton value="text" size="sm">
					<TextFieldsIcon fontSize="small" />
				</IconButton>
			</Tooltip>
		</ToggleButtonGroup>
	);
}
