import QuestionCard, { type QuestionCardProps } from '@components/QuestionCard';
import { useTheme } from '@mui/joy';
import { LayoutGroup, motion } from 'motion/react';
import type { IQuestion } from '~/models/Question';

type QuestionListViewProps = {
	questions: IQuestion[];
	cardProps: Omit<QuestionCardProps, 'question'>;
};

export default function QuestionListView(props: QuestionListViewProps) {
	const { questions, cardProps: questionCardProps } = props;

	const theme = useTheme();

	return (
		<div className="mb-18 flex w-full flex-col p-0">
			<LayoutGroup>
				{questions.map((question) => (
					<motion.div
						key={question.id}
						className="px-5 py-3"
						style={{
							backgroundColor: question.isFocused
								? theme.vars.palette.background.level1
								: 'transparent',
						}}
						whileHover={
							question.isFocused ? {} : { backgroundColor: theme.vars.palette.background.surface }
						}
						layout
					>
						<QuestionCard question={question} {...questionCardProps} />
					</motion.div>
				))}
			</LayoutGroup>
		</div>
	);
}
