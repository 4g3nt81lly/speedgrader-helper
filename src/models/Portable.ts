import * as z from 'zod';

export default interface IPortable<T = any> {
	get exportedValidator(): z.ZodType<T>;
	loadExported(data: T): void;
	loadExportedString(data: string): T;

	toExported(): T;
	toExportedString(): string;
}

export class PortableAdaptor {
	public static loadExportedString<T>(this: IPortable<T>, data: string): T {
		let parsed: unknown;
		try {
			parsed = JSON.parse(data);
		} catch (error) {
			throw new Error('Corrupted exported JSON data');
		}
		const result = this.exportedValidator.safeParse(parsed);
		if (!result.success) {
			throw new Error(`Invalid exported JSON data: ${result.error.message}`);
		}
		return result.data;
	}

	public static toExportedString<T>(this: IPortable<T>): string {
		return JSON.stringify(this.toExported(), null, 4);
	}
}
