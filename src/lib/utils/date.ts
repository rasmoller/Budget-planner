export function formatDateDMY(value: string | null | undefined): string {
	if (!value) return '';
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (!m) return value;
	return `${m[3]}/${m[2]}/${m[1]}`;
}
