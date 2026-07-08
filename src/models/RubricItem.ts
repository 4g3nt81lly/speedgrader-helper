import { isDecimalPositive } from '#shared/decimal';
import type { Nullable } from '#shared/types/utils';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

export interface IRubricItem {
	id: string;
	description: string;
	points: string;
}

export class RubricItem {
	public static create(item: Omit<IRubricItem, 'id'>): IRubricItem {
		return {
			id: uuidv4(),
			description: item.description,
			points: item.points,
		};
	}

	public static fromText(text: string): Nullable<IRubricItem> {
		text = text.trim();
		if (!text) return null;

		const match = text.match(/(?<=[\d.])[ \t]+/);
		if (!match?.[0]) return null;

		const pointsText = text.substring(0, match.index!);
		const descriptionText = text
			.substring(match.index! + match[0].length)
			.replace('\\\n', '\n');
		try {
			return this.create({
				description: descriptionText,
				points: Decimal(pointsText).toString(),
			});
		} catch (error) {
			return null;
		}
	}

	public static toText(item: IRubricItem) {
		return `${isDecimalPositive(item.points) ? '+' : ''}${item.points}\t${item.description.replace('\n', '\\\n')}`;
	}
}
