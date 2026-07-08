import Decimal from 'decimal.js';
import Patterns from './patterns';

export function isDecimal(value: string) {
	return Patterns.DECIMAL.test(value);
}

// NOTE: This returns true iff the number is nonnegative
export function isDecimalPositive(decimal: Decimal.Value) {
	return Decimal(decimal).isPositive();
}

export function isDecimalNegative(decimal: Decimal.Value) {
	return Decimal(decimal).isNegative();
}

export function isDecimalEqual(decimal1: Decimal.Value, decimal2: Decimal.Value) {
	return Decimal.sub(decimal1, decimal2).isZero();
}

export function isDecimalGreaterThan(decimal1: Decimal.Value, decimal2: Decimal.Value) {
	// Careful: isNegative() is used for strict inequality since isPositive() returns true for 0
	return Decimal.sub(decimal2, decimal1).isNegative();
}

export function isDecimalLessThan(decimal1: Decimal.Value, decimal2: Decimal.Value) {
	return Decimal.sub(decimal1, decimal2).isNegative();
}

export function isDecimalWithinRange(
	decimal: Decimal.Value,
	lower: Decimal.Value,
	upper: Decimal.Value
) {
	return !isDecimalLessThan(decimal, lower) && !isDecimalGreaterThan(decimal, upper);
}
