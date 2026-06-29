import { questionTypeDisplayName, type IQuestion, type QuestionType } from '@models/Question';
import type { IQuiz } from '@models/Quiz';
import { Checkbox, Chip, Tooltip, Typography } from '@mui/joy';
import Constants from '@shared/constants';
import { motion } from 'motion/react';
import RubricAccordion from './RubricAccordion';

type QuestionCardProps = {
	question: IQuestion;
} & QuestionCardOptions;

export type QuestionCardOptions =
	| {
			readonly: true;
			focusMode?: undefined;
			updateQuestion?: undefined;
	  }
	| {
			readonly?: false;
			focusMode: IQuiz['focusMode'];
			updateQuestion(newQuestion: IQuestion): void;
	  };

export default function QuestionCard(props: QuestionCardProps) {
	const { question, readonly, focusMode, updateQuestion } = props;
	const questionLabel = question.id;

	function toggleQuestionFocus() {
		if (readonly) return;
		updateQuestion!({ ...question, isFocused: !question.isFocused });
	}

	return (
		<motion.div className="flex flex-1 flex-col gap-1.5" layout="position">
			<div className="flex justify-between">
				{readonly ? (
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
								onChange={toggleQuestionFocus}
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

			{!readonly && <RubricAccordion question={question} updateQuestion={updateQuestion!} />}
		</motion.div>
	);
}

function QuestionTypeChip({ type }: { type: QuestionType }) {
	return <Chip size="sm">{questionTypeDisplayName[type] ?? 'Unknown'}</Chip>;
}
