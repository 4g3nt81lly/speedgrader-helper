import { v4 as uuidv4 } from 'uuid';
import type { SetOptional } from '~/types/utils';

export interface IRubricItem {
	id: string;
	title: string;
	description: string;
	points: string;
}

export class RubricItem {
	public static create(item: SetOptional<Omit<IRubricItem, 'id'>, 'title'>): IRubricItem {
		return {
			id: uuidv4(),
			title: item.title ?? '',
			description: item.description,
			points: item.points,
		};
	}
}
