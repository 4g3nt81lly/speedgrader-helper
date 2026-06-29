import QuestionCard, { type QuestionCardOptions } from '@components/QuestionCard';
import { useTheme } from '@mui/joy';
import { LayoutGroup, motion } from 'motion/react';
import type { IQuestion } from '~/models/Question';

type QuestionListViewProps = {
	questions: IQuestion[];
	cardOptions: QuestionCardOptions;
};

export default function QuestionListView(props: QuestionListViewProps) {
	const { questions, cardOptions: questionCardProps } = props;

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
