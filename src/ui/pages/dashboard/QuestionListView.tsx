import { List, ListItem } from '@mui/joy';
import type { IQuestion } from '~/models/Question';
import QuestionCard from '../../components/QuestionCard';

export type QuestionListViewProps = { questions: IQuestion[] } & (
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

export default function QuestionListView(props: QuestionListViewProps) {
	const { questions, ...questionProps } = props;
	return (
		<List className="mb-18 w-full p-0">
			{questions.map((question) => (
				<ListItem
					key={question.id}
					className="px-5 py-3"
					sx={{
						bgcolor: question.isFocused ? 'background.level1' : 'transparent',
						':hover': question.isFocused ? {} : { bgcolor: 'background.surface' },
					}}
				>
					<QuestionCard question={question} {...questionProps} />
				</ListItem>
			))}
		</List>
	);
}
