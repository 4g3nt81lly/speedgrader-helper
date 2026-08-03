type ChipProps = {
	label: string;
	type?: ChipType;
};

type ChipType = 'info' | 'success' | 'warning' | 'error';

export default function StatusChip(props: ChipProps) {
	const { label, type = 'info' } = props;
	return (
		<div className={`flex h-full gap-2 px-3 ${containerColor[type]} items-center rounded-full`}>
			<div className={`flex ${indicatorColor[type]} size-2 rounded-full`}></div>
			<div className={`${textColor[type]} text-sm font-semibold`}>{label}</div>
		</div>
	);
}

const containerColor: Record<ChipType, string> = {
	info: 'bg-gray-200',
	success: 'bg-green-100',
	warning: 'bg-amber-100',
	error: 'bg-red-100',
};

const indicatorColor: Record<ChipType, string> = {
	info: 'bg-gray-500',
	success: 'bg-green-500',
	warning: 'bg-amber-500',
	error: 'bg-red-400',
};

const textColor: Record<ChipType, string> = {
	info: 'text-gray-500',
	success: 'text-green-500',
	warning: 'text-amber-500',
	error: 'text-red-400',
};
