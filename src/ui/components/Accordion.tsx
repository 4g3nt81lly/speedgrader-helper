import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/joy';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { inOutTransitionMotionProps } from '../utils/animation';

type AccordionProps = {
	summary: ReactNode;
	children: ReactNode | ReactNode[];
	onToggle?(open: boolean): void;
} & (
	| {
			open: boolean;
			setOpen(open: boolean): void;
	  }
	| {
			open?: undefined;
			setOpen?: undefined;
	  }
);

export default function Accordion(props: AccordionProps) {
	const { summary, children: details, open, setOpen, onToggle } = props;

	const theme = useTheme();
	const [_open, _setOpen] = useState(false);

	const [summaryBgColor, summaryBgColorOnActive] = useMemo(() => {
		return [
			transparentize(theme.vars.palette.background.level2, 0),
			transparentize(theme.vars.palette.background.level2, 1),
		];
	}, []);

	const isOpen = open ?? _open;
	const setIsOpen = setOpen ?? _setOpen;

	return (
		<div className="relative flex flex-col">
			<motion.div
				className="flex items-center justify-between rounded-lg py-1.5 pr-2 pl-3 hover:cursor-pointer"
				style={{ backgroundColor: summaryBgColor }}
				whileHover={{ backgroundColor: summaryBgColorOnActive }}
				onClick={() => setIsOpen(!isOpen)}
			>
				{summary}
				<ExpandMoreIcon
					fontSize="small"
					className={`transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}
				/>
			</motion.div>

			<motion.div className="relative" layout="size">
				<AnimatePresence mode="popLayout">
					{isOpen && (
						<motion.div
							className="px-3 py-0"
							layout="size"
							{...inOutTransitionMotionProps({ opacity: [0, 1] })}
						>
							{details}
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</div>
	);
}

function transparentize(colorExpr: string, opacity: number) {
	return `color-mix(in srgb, ${colorExpr} ${opacity * 100}%, transparent)`;
}
