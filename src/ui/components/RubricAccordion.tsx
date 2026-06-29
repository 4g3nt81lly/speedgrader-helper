import TextFieldsIcon from '@mui/icons-material/TextFields';
import TuneIcon from '@mui/icons-material/Tune';
import { Button, Chip, IconButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/joy';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type MouseEvent } from 'react';
import type { IQuestion } from '~/models/Question';
import Rubric from '~/models/Rubric';
import Constants from '~/shared/constants';
import { inOutTransitionMotionProps } from '../utils/animation';
import Accordion from './Accordion';
import RubricListEditor from './RubricListEditor';
import RubricTextEditor from './RubricTextEditor';

type RubricAccordionProps = {
	question: IQuestion;
	updateQuestion(newQuestion: IQuestion): void;
};

export const enum RubricEditorType {
	list = 'list',
	text = 'text',
}

export default function RubricAccordion(props: RubricAccordionProps) {
	const { question, updateQuestion } = props;

	const [editorType, setEditorType] = useState<RubricEditorType>(RubricEditorType.list);

	const updateRubric = (newRubric: IQuestion['rubric']) => {
		updateQuestion!({ ...question, rubric: newRubric });
	};

	const handleAddRubric = (_event: MouseEvent<HTMLButtonElement>) => {
		updateRubric(Rubric.create({}));
	};

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
						<AnimatePresence mode="wait">
							{editorType === RubricEditorType.list ? (
								<motion.div
									key={RubricEditorType.list}
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
									key={RubricEditorType.text}
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
				<IconButton value={RubricEditorType.list} size="sm">
					<TuneIcon fontSize="small" />
				</IconButton>
			</Tooltip>
			<Tooltip title="Text Editor" placement="bottom" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
				<IconButton value={RubricEditorType.text} size="sm">
					<TextFieldsIcon fontSize="small" />
				</IconButton>
			</Tooltip>
		</ToggleButtonGroup>
	);
}
