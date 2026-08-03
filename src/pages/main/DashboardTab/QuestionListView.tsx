import type { IQuestion } from '#models/Question';
import QuestionCard from '#pages/components/QuestionCard';
import { useTheme } from '@mui/joy';
import { LayoutGroup, motion } from 'motion/react';

type QuestionListViewProps = {
	questions: IQuestion[];
} & (
	| { readOnly: true; focusMode?: undefined; updateQuestion?: undefined }
	| { readOnly?: false; focusMode: boolean; updateQuestion(question: IQuestion): void }
);

export default function QuestionListView(props: QuestionListViewProps) {
	const { questions, ...cardProps } = props;

	const theme = useTheme();

	return (
		<div className="flex w-full flex-col p-0">
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
						<QuestionCard question={question} {...cardProps} />
					</motion.div>
				))}
			</LayoutGroup>
		</div>
	);
}
