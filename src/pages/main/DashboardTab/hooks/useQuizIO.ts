import Quiz, { type IQuiz } from '#models/Quiz';
import { ExportedQuizJsonSchema } from '#schemas/ExportedQuizJson.schema';
import type { Nullable } from '#shared/types/utils';
import { toast } from 'sonner';

export default function useQuizIO() {
	async function exportQuiz(quiz: IQuiz) {
		try {
			const data = Quiz.toExported(quiz);
			const blob = new Blob([JSON.stringify(data, null, 4)], {
				type: 'application/json',
			});
			const downloadURL = URL.createObjectURL(blob);
			await chrome.downloads.download({
				url: downloadURL,
				filename: `${quiz.title}.json`,
				saveAs: true,
			});
		} catch (error) {
			console.error('Error while exporting quiz:', error);
			toast.error('Export Error', {
				description: `Unable to export quiz: ${error instanceof Error ? error.message : 'unknown error'}`,
			});
		}
	}

	async function readJSON() {
		return new Promise<Nullable<unknown>>((resolve) => {
			const fileInput = document.createElement('input');
			fileInput.type = 'file';
			fileInput.accept = '.json,application/json';
			fileInput.onchange = async () => {
				const file = fileInput.files?.item(0);
				if (!file) {
					return resolve(null);
				}
				try {
					resolve(JSON.parse(await file.text()));
				} catch {
					resolve(null);
				}
			};
			fileInput.click();
		});
	}

	async function importQuiz(quiz?: IQuiz) {
		const jsonObject = await readJSON();
		if (!jsonObject) return null;
		if (
			quiz &&
			!confirm('Import rubric? This will replace existing rubric when applicable.')
		) {
			return null;
		}

		const parseResult = ExportedQuizJsonSchema.safeParse(jsonObject);
		if (!parseResult.success) {
			toast.error('Import Error', {
				description: `Invalid file format: ${parseResult.error.message}`,
			});
			return null;
		}
		const exportedQuiz = parseResult.data;
		try {
			return Quiz.fromExported(exportedQuiz, quiz);
		} catch (error) {
			toast.error('Import Error', {
				description: `Invalid file format: ${error instanceof Error ? error.message : 'Unknown error'}`,
			});
			return null;
		}
	}

	return { exportQuiz, importQuiz };
}
