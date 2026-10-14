/** Keep IDs stable while deliberately changing array order. */
export function moveItem<T>(items: T[], index: number, delta: number): T[] {
	const result = [...items];
	const next = index + delta;
	if (next < 0 || next >= result.length) return result;
	[result[index], result[next]] = [result[next], result[index]];
	return result;
}
