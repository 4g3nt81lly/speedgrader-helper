import Question, {
	questionTypeDisplayName,
	type IQuestion,
	type QuestionType,
} from '#models/Question';
import Constants from '#pages/constants';
import RubricAccordion from '#pages/main/components/RubricAccordion';
import { Checkbox, Chip, Tooltip, Typography } from '@mui/joy';
import { motion } from 'motion/react';

type QuestionCardProps = {
	question: IQuestion;
} & (
	| { readOnly: true; focusMode?: undefined; updateQuestion?: undefined }
	| { readOnly?: false; focusMode: boolean; updateQuestion(newQuestion: IQuestion): void }
);

export default function QuestionCard(props: QuestionCardProps) {
	const { question, focusMode, readOnly, updateQuestion } = props;
	const questionLabel = question.id;

	function toggleFocus() {
		if (readOnly) return;
		updateQuestion(Question.toggleFocus(question));
	}

	return (
		<motion.div className="flex flex-1 flex-col gap-1.5" layout="position">
			<div className="flex justify-between">
				{readOnly ? (
					<div>
						<div className="mb-1 flex flex-col gap-1">
							<Typography fontWeight="bold">{questionLabel}</Typography>
							<QuestionTypeChip type={question.type} />
						</div>
						<Typography level="body-xs" className="line-clamp-4 wrap-anywhere text-ellipsis">
							{question.body}
						</Typography>
					</div>
				) : (
					<div className="flex items-start gap-2">
						<Tooltip
							title={focusMode ? 'Select to focus' : ''}
							size="sm"
							placement="bottom-start"
							enterDelay={Constants.TOOLTIP_ENTER_DELAY}
						>
							<Checkbox
								className="mt-0.5"
								checked={question.isFocused}
								disabled={!focusMode}
								onChange={toggleFocus}
							/>
						</Tooltip>
						<div className="mb-0.5 flex flex-col gap-1.5">
							<Typography fontWeight="bold">{questionLabel}</Typography>
							<QuestionTypeChip type={question.type} />
							<Typography level="body-xs" className="line-clamp-4 wrap-anywhere text-ellipsis">
								{question.body}
							</Typography>
						</div>
					</div>
				)}
				<Typography className="whitespace-nowrap">{`- / ${question.points}`}</Typography>
			</div>

			{!readOnly && <RubricAccordion question={question} updateQuestion={updateQuestion} />}
		</motion.div>
	);
}

function QuestionTypeChip({ type }: { type: QuestionType }) {
	return <Chip size="sm">{questionTypeDisplayName[type] ?? 'Unknown'}</Chip>;
}
