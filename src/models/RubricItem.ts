import type { SetOptional } from '#shared/types/utils';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

export interface IRubricItem {
	id: string;
	description: string;
	points: string;
}

export class RubricItem {
	public static create(item: SetOptional<IRubricItem, 'id'>): IRubricItem {
		return {
			id: item.id ?? uuidv4(),
			description: item.description,
			points: Decimal(item.points).toString(),
		};
	}
}
