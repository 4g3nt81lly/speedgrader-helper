import Constants from '#pages/constants';
import type { RubricEditorType } from '#shared/settings';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TuneIcon from '@mui/icons-material/Tune';
import { IconButton, ToggleButtonGroup, Tooltip } from '@mui/joy';

export default function RubricEditorSelector({
	editorType,
	setEditorType,
}: {
	editorType: RubricEditorType;
	setEditorType(editorType: RubricEditorType): void;
}) {
	return (
		<ToggleButtonGroup
			value={editorType}
			onChange={(_, newValue) => newValue && setEditorType(newValue)}
		>
			<Tooltip title="UI Editor" placement="bottom" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
				<IconButton value="list" size="sm">
					<TuneIcon fontSize="small" />
				</IconButton>
			</Tooltip>
			<Tooltip title="Text Editor" placement="bottom" enterDelay={Constants.TOOLTIP_ENTER_DELAY}>
				<IconButton value="text" size="sm">
					<TextFieldsIcon fontSize="small" />
				</IconButton>
			</Tooltip>
		</ToggleButtonGroup>
	);
}
