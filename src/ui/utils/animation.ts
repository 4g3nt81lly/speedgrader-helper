type AnimatableKeys = 'opacity' | 'scale' | 'x' | 'y';

export function inOutTransitionMotionProps(
	transitions: Partial<Record<AnimatableKeys, [number, number]>>
) {
	const props: Record<
		'initial' | 'animate' | 'exit',
		Partial<Record<AnimatableKeys, number>>
	> = { initial: {}, animate: {}, exit: {} };
	for (const [key, [start, end]] of Object.entries(transitions)) {
		const animatableKey = key as AnimatableKeys;
		props.initial[animatableKey] = start;
		props.animate[animatableKey] = end;
		props.exit[animatableKey] = start;
	}
	return props;
}
