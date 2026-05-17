import { questionTypeDisplayName, type IQuestion, type QuestionType } from '@models/Question';
import {
	Accordion,
	AccordionDetails,
	accordionDetailsClasses,
	AccordionGroup,
	AccordionSummary,
	accordionSummaryClasses,
	Button,
	Checkbox,
	Chip,
	FormControl,
	FormHelperText,
	Tooltip,
	Typography,
} from '@mui/joy';
import type { SxProps } from '@mui/material/styles';
import Constants from '@shared/constants';
import type { MouseEvent } from 'react';
import Rubric from '~/models/Rubric';
import RubricTable from './RubricTable';

export type QuestionCardProps = { question: IQuestion } & (
	| {
			updateQuestion?: undefined;
			disableFocusControl: true;
			disableRubricEditor: true;
	  }
	| {
			updateQuestion?(newQuestion: IQuestion): void;
			disableFocusControl?: boolean;
			disableRubricEditor?: boolean;
	  }
);

export default function QuestionCard(props: QuestionCardProps) {
	const { question, updateQuestion, disableFocusControl, disableRubricEditor } = props;

	const updateRubric = (newRubric: IQuestion['rubric']) => {
		updateQuestion!({ ...question, rubric: newRubric });
	};

	const handleAddRubric = (_event: MouseEvent<HTMLButtonElement>) => {
		updateRubric(Rubric.create({}));
	};

	const toggleQuestionFocus = () => {
		updateQuestion!({ ...question, isFocused: !question.isFocused });
	};

	const questionLabel = question.id;

	return (
		<div className="flex flex-1 flex-col gap-1.5">
			<div className="flex justify-between">
				{disableFocusControl ? (
					<div>
						<div className="mb-1 flex flex-col gap-1">
							<Typography level="title-md">{questionLabel}</Typography>
							<QuestionTypeChip type={question.type} />
						</div>
						<Typography level="body-xs" className="line-clamp-4 wrap-anywhere text-ellipsis">
							{question.body}
						</Typography>
					</div>
				) : (
					<FormControl>
						<Tooltip
							title="Select to focus"
							size="sm"
							placement="bottom-start"
							enterDelay={Constants.TOOLTIP_ENTER_DELAY}
						>
							<Checkbox
								label={
									<div className="mb-0.5 flex flex-col gap-2">
										{questionLabel}
										<QuestionTypeChip type={question.type} />
									</div>
								}
								checked={question.isFocused}
								className="font-medium whitespace-nowrap"
								onChange={toggleQuestionFocus}
							/>
						</Tooltip>
						<FormHelperText>
							<Typography level="body-xs" className="line-clamp-4 wrap-anywhere text-ellipsis">
								{question.body}
							</Typography>
						</FormHelperText>
					</FormControl>
				)}
				<Typography className="whitespace-nowrap">{`- / ${question.points}`}</Typography>
			</div>

			{!disableRubricEditor && (
				<AccordionGroup sx={rubricTableAccordionStyles}>
					<Accordion>
						<AccordionSummary className="rounded-lg">
							<Typography component="span" display="flex" alignItems="center">
								Rubric&ensp;<Chip size="sm">{question.rubric?.items.length ?? 0}</Chip>
							</Typography>
						</AccordionSummary>
						<AccordionDetails className="px-3 py-0">
							{question.rubric ? (
								<RubricTable
									rubric={question.rubric}
									maxPoints={question.points}
									updateRubric={updateRubric}
								/>
							) : (
								<Button variant="plain" onClick={handleAddRubric}>
									Add rubric
								</Button>
							)}
						</AccordionDetails>
					</Accordion>
				</AccordionGroup>
			)}
		</div>
	);
}

const rubricTableAccordionStyles: SxProps = {
	[`& .${accordionSummaryClasses.indicator}`]: {
		transition: '0.3s',
	},
	[`& .${accordionDetailsClasses.content}.${accordionSummaryClasses.expanded}`]: {
		padding: 0,
	},
	[`& [aria-expanded='true'] .${accordionSummaryClasses.indicator}`]: {
		transform: 'rotate(180deg)',
	},
	[`& .${accordionSummaryClasses.button}:hover`]: {
		borderRadius: 'lg',
	},
	[`&:not([aria-selected='true']) .${accordionSummaryClasses.button}:hover`]: {
		bgcolor: 'background.level2',
	},
	[`&[aria-selected='true'] .${accordionSummaryClasses.button}:hover`]: {
		bgcolor: 'background.level3',
	},
};

export function QuestionTypeChip({ type }: { type: QuestionType }) {
	return <Chip size="sm">{questionTypeDisplayName[type] ?? 'Unknown'}</Chip>;
}
