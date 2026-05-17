import type { SetOptional } from '~/types/utils';
import { RubricItem, type IRubricItem } from './RubricItem';

export interface IRubric {
	items: IRubricItem[];
	gradingMode: 'positive' | 'negative';
}

export default class Rubric {
	public static create(rubric: SetOptional<IRubric, 'items' | 'gradingMode'>): IRubric {
		return {
			items: rubric.items?.map((item) => RubricItem.create(item)) ?? [],
			gradingMode: rubric.gradingMode ?? 'positive',
		};
	}
}
