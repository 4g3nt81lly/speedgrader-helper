import Quiz, { type IQuiz } from '#models/Quiz';
import { ExportedRubricJsonSchema } from '#schemas/ExportedQuizJson.schema';
import type { Nullable } from '#shared/types/utils';

export default function useQuizIO() {
	async function exportQuiz(quiz: IQuiz) {
		const data = Quiz.toExported(quiz);
		const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
		const downloadURL = URL.createObjectURL(blob);
		return chrome.downloads.download({
			url: downloadURL,
			filename: `${quiz.title}.json`,
			saveAs: true,
		});
	}

	async function readJSON<T>() {
		return new Promise<Nullable<T>>((resolve) => {
			const fileInput = document.createElement('input');
			fileInput.type = 'file';
			fileInput.accept = '.json,application/json';
			fileInput.onchange = async () => {
				const file = fileInput.files?.item(0);
				if (!file) {
					return resolve(null);
				}
				try {
					resolve(<T>JSON.parse(await file.text()));
				} catch {
					resolve(null);
				}
			};
			fileInput.click();
		});
	}

	async function importQuiz(quiz: IQuiz) {
		const jsonObject = await readJSON();
		if (
			!jsonObject ||
			!confirm('Import rubric? This will replace existing rubric when applicable.')
		) {
			return null;
		}

		const parseResult = ExportedRubricJsonSchema.safeParse(jsonObject);
		if (!parseResult.success) {
			alert(`Invalid file format: ${parseResult.error.message}`);
			return null;
		}
		const exportedQuiz = parseResult.data;
		try {
			return Quiz.fromExported(quiz, exportedQuiz);
		} catch (error) {
			alert(
				`Invalid file format: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
			return null;
		}
	}

	return { exportQuiz, importQuiz };
}
