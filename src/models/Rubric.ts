import { defaultAppSettings } from '#shared/settings';
import type { SetOptional } from '#shared/types/utils';
import { RubricItem, type IRubricItem } from './RubricItem';
import { RubricParser } from './RubricParser';

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

	public static fromText(text: string, rubric?: IRubric): IRubric {
		return RubricParser.parse(text, rubric);
	}

	public static toText(rubric: IRubric) {
		return RubricParser.stringify(rubric);
	}
}
