import Decimal from 'decimal.js';
import { defaultAppSettings } from '~/shared/settings';
import { isDecimalGreaterThan } from '~/shared/utils';
import type { SetOptional } from '~/types/utils';
import type { IQuestion } from './Question';
import { RubricItem, type IRubricItem } from './RubricItem';

export interface IRubric {
	items: IRubricItem[];
	gradingMode: GradingMode;
}

export type GradingMode = 'positive' | 'negative';

export default class Rubric {
	public static create(
		rubric: SetOptional<IRubric, 'items' | 'gradingMode'> = {}
	): IRubric {
		return {
			items: rubric.items?.map((item) => RubricItem.create(item)) ?? [],
			gradingMode: rubric.gradingMode ?? defaultAppSettings.defaultGradingMode,
		};
	}

	public static validate(rubric: IRubric, question: IQuestion) {
		return !rubric.items.some(({ points }) =>
			isDecimalGreaterThan(Decimal.abs(points), question.points)
		);
	}

	public static fromText(text: string): IRubric {
		const delimiterPattern = /(?<=[^\\\s])\n+/;
		const parsedItems = text
			.trim()
			.split(delimiterPattern)
			.flatMap((rubricItemText) => RubricItem.fromText(rubricItemText) ?? []);

		return {
			items: parsedItems,
			gradingMode: 'positive',
		};
	}

	public static toText(rubric: IRubric) {
		return rubric.items.map(RubricItem.toText).join('\n');
	}
}
