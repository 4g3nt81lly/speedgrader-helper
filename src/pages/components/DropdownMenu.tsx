import { Option, Select } from '@mui/joy';
import type { ReactNode } from 'react';

type DropdownMenuProps<K extends keyof any, V> = {
	items: Record<K, V>;
	selectedItem: K;
	onSelect(item: K): void;
} & (V extends ReactNode | ReactNode[]
	? { render?(key: K, value: V): ReactNode | ReactNode[] }
	: { render(key: K, value: V): ReactNode | ReactNode[] });

export default function DropdownMenu<K extends keyof any, V>({
	items,
	selectedItem,
	render,
	onSelect: selectItem,
}: DropdownMenuProps<K, V>) {
	return (
		<Select size="sm" value={selectedItem} onChange={(_event, item) => selectItem(item!)}>
			{Object.entries<V>(items).map(([key, value]) => (
				<Option key={key} value={key}>
					{render?.(key as K, value) ?? (items[key as K] as ReactNode)}
				</Option>
			))}
		</Select>
	);
}
