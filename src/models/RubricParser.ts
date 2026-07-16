import Patterns from '#shared/patterns';
import type { Nullable } from '#shared/types/utils';
import { isDecimalPositive } from '#shared/utils/decimal';
import type { IRubric } from './Rubric';
import Rubric from './Rubric';
import { RubricItem, type IRubricItem } from './RubricItem';

export class RubricParser {
	public static parse(text: string, rubric?: IRubric): IRubric {
		const newItems: IRubricItem[] = [];
		const indices = new Set<number>();

		for (const match of text.trim().matchAll(Patterns.DSL.RUBRIC_ITEM)) {
			const groups = match.groups ?? {};
			let { index, points, description } = groups;
			description = description?.replace(/\\[\t ]*\n/g, '\n').trimEnd();
			if (!points || !description) continue;

			let newItem: Nullable<IRubricItem> = null;
			if (index) {
				const numberIndex = Number(index) - 1;
				if (indices.has(numberIndex)) {
					continue;
				}
				const oldItem = rubric?.items[numberIndex];
				if (oldItem) {
					indices.add(numberIndex);
				}
				newItem = oldItem ?? null;
			}
			newItem = RubricItem.create({ id: newItem?.id, points, description });
			newItems.push(newItem);
		}
		return Rubric.create({ items: newItems, gradingMode: rubric?.gradingMode });
	}

	public static stringify(rubric: IRubric): string {
		if (rubric.items.length === 0) return '';

		const blocks = rubric.items.map(
			(item, index) =>
				[
					`${index + 1}.`,
					`(${isDecimalPositive(item.points) ? '+' : ''}${item.points})`,
					item.description.replace(/\n/g, '\\\n'),
				] as const
		);
		const [indexWidth, pointsWidth] = blocks.reduce(
			([indexWidth, pointsWidth], [index, points]) => {
				return [
					Math.max(indexWidth, index.length),
					Math.max(pointsWidth, points.length),
				] as const;
			},
			[-Infinity, -Infinity] as const
		);

		return blocks
			.map(
				([index, points, description]) =>
					index.padStart(indexWidth) + ' ' + points.padEnd(pointsWidth + 1) + description
			)
			.join('\n');
	}
}
