import type { GradingModeSchema } from '#schemas/Rubric.schema';
import { defaultAppSettings } from '#shared/settings';
import type { SetOptional } from '#shared/types/utils';
import { isDecimalPositive } from '#shared/utils/decimal';
import z from 'zod';
import type { IQuestion } from './Question';
import { RubricItem, type IRubricItem } from './RubricItem';
import { RubricParser } from './RubricParser';

export interface IRubric {
	items: IRubricItem[];
	gradingMode: GradingMode;
}

export type GradingMode = z.infer<typeof GradingModeSchema>;

export default class Rubric {
	public static create(
		rubric: SetOptional<IRubric, 'items' | 'gradingMode'> = {}
	): IRubric {
		return {
			items: rubric.items?.map((item) => RubricItem.create(item)) ?? [],
			gradingMode: rubric.gradingMode ?? defaultAppSettings.defaultGradingMode,
		};
	}

	public static fromText(text: string, rubric?: IRubric): IRubric {
		return RubricParser.parse(text, rubric);
	}

	public static toText(rubric: IRubric) {
		return RubricParser.stringify(rubric);
	}

	public static getInitialPoints(
		maxPoints: IQuestion['points'],
		gradingMode: GradingMode
	) {
		return gradingMode === 'negative' ? maxPoints : '0';
	}

	public static getComments(rubricItems: IRubricItem[]) {
		if (rubricItems.length === 0) {
			return '';
		}
		return rubricItems
			.map(({ points, description }) => {
				return `(${isDecimalPositive(points) ? '+' : ''}${points}) ${description}`;
			})
			.join('\n');
	}
}
