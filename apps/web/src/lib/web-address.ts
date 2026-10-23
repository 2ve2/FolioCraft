/** Adds https:// to an address typed without a scheme (github.com/user); anything else stays as typed. */
export function withHttps(value: string) {
	const address = value.trim().replace(/^\/\//, "");
	if (!address || /^[a-z][a-z\d+.-]*:/i.test(address) || /\s/.test(address)) return value;
	return /^[^/?#]+\.[a-z]{2,}(?:[/?#:]|$)/i.test(address) ? `https://${address}` : value;
}
