import { questionTypeDisplayName, type IQuestion, type QuestionType } from '@models/Question';
import { Checkbox, Chip, FormControl, FormHelperText, Tooltip, Typography } from '@mui/joy';
import Constants from '@shared/constants';
import { motion } from 'motion/react';
import RubricAccordion from './RubricAccordion';

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
	const questionLabel = question.id;

	function toggleQuestionFocus() {
		updateQuestion!({ ...question, isFocused: !question.isFocused });
	}

	return (
		<motion.div className="flex flex-1 flex-col gap-1.5" layout="position">
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
				<RubricAccordion question={question} updateQuestion={updateQuestion!} />
			)}
		</motion.div>
	);
}

export function QuestionTypeChip({ type }: { type: QuestionType }) {
	return <Chip size="sm">{questionTypeDisplayName[type] ?? 'Unknown'}</Chip>;
}
