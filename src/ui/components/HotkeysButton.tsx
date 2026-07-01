import { Chip, ChipDelete, Tooltip, Typography, useTheme } from '@mui/joy';
import { type KeyboardEvent, type MouseEvent } from 'react';
import { useRecordHotkeys } from 'react-hotkeys-hook';
import Constants from '~/shared/constants';

type HotkeysRecorderButtonProps = {
	hotkeys: string;
	defaultHotkeys: string;
	setHotkeys(hotkeys: string): void;
};

const modifierKeys = ['shift', 'ctrl', 'alt', 'meta'] as const;
type ModifierKey = (typeof modifierKeys)[number];

const modifierKeyDisplayChar: Record<ModifierKey, string> = {
	shift: '\u21e7',
	ctrl: '\u2303',
	alt: '\u2325',
	meta: '\u2318',
};

const otherKeyDisplayChar: Record<string, string> = {
	escape: '\u238b',
	minus: '-',
	equal: '=',
	backspace: '\u232b',
	delete: '\u2326',
	divide: '\u00f7',
	multiply: '\u00d7',
	bracketleft: '[',
	bracketright: ']',
	backslash: '\\',
	semicolon: ';',
	enter: '\u23ce',
	add: '+',
	period: '.',
	comma: ',',
	slash: '/',
	arrowleft: '\u2190',
	arrowright: '\u2192',
	arrowup: '\u2191',
	arrowdown: '\u2193',
};

export default function HotkeysButton({
	hotkeys,
	defaultHotkeys,
	setHotkeys,
}: HotkeysRecorderButtonProps) {
	const theme = useTheme();
	const [recordedKeys, { isRecording, start: startRecording, stop: stopRecording, resetKeys }] =
		useRecordHotkeys(false, []);

	const { modifiers, keys } = getHotkeysInfo(isRecording ? recordedKeys : hotkeys);

	const canReset = !isRecording && hotkeys !== defaultHotkeys;

	function beginRecording(event: MouseEvent<HTMLElement>) {
		if (isRecording) return;
		const element = event.target as HTMLElement;
		element.focus();
		startRecording();
	}

	function handleKeyUp(event: KeyboardEvent<HTMLElement>) {
		if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
		if (modifiers.length > 0 && keys.length > 0) {
			(event.target as HTMLButtonElement).blur();
			setHotkeys([...modifiers, ...keys].join(Constants.HOTKEYS_DELIMITER));
			dismissRecording();
		} else {
			resetKeys();
		}
	}

	function dismissRecording() {
		if (!isRecording) return;
		stopRecording();
		resetKeys();
	}

	function resetHotkeys() {
		if (isRecording) return;
		setHotkeys(defaultHotkeys);
		resetKeys();
	}

	return (
		<Chip
			className={`min-w-20 cursor-pointer border px-3 py-0.5 text-center transition-all ${isRecording ? 'border-3' : ''} outline-0`}
			variant="plain"
			color="primary"
			sx={{
				borderColor: isRecording
					? theme.vars.palette.primary.solidBg
					: theme.vars.palette.primary.outlinedBorder,
			}}
			endDecorator={
				canReset ? (
					<Tooltip title="Remove hotkeys" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
						<ChipDelete className="ml-0.5" onDelete={resetHotkeys} />
					</Tooltip>
				) : undefined
			}
			onClick={beginRecording}
			onBlur={dismissRecording}
			onKeyUp={handleKeyUp}
		>
			<Typography level="body-sm" fontWeight={500} color="primary">
				{modifiers.length + keys.length > 0
					? [
							...modifiers.map((modifier) => modifierKeyDisplayChar[modifier]),
							...keys.map((key) => otherKeyDisplayChar[key] ?? key),
						].join(' + ')
					: '\u00a0'}
			</Typography>
		</Chip>
	);
}

function getHotkeysInfo(hotkeys: string | Set<string>) {
	hotkeys = new Set(hotkeys instanceof Set ? hotkeys : hotkeys.split(Constants.HOTKEYS_DELIMITER));

	const recordedModifierKeys = modifierKeys.filter((modifierKey) => hotkeys.delete(modifierKey));
	const otherKeys = [...hotkeys].sort();
	return {
		modifiers: recordedModifierKeys,
		keys: otherKeys,
	};
}
