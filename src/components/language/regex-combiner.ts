/**
 * Combines a sequence of regular expression fragments. When individual fragments aren't valid regular expressions
 * then the must be passed in as strings. The regular expression derived from the fragments is all that needs to
 * be a valid regular expression
 * @param {string | RegExp} fragment The first fragment
 * @param {string | RegExp} fragments The additional fragments
 * @return {RegExp} A regular expression object that is constructed from the specified fragments
 */
export default function regexFrom(fragment: string | RegExp, ...fragments: Array<string | RegExp>): RegExp {
    const combined = [fragment, ...fragments]
        .map(regex => asStringFrom(regex).replace(/^\/|\/$/, ""))
        .join("");
    return new RegExp(combined);
}

/**
 * Simply returns the string representation of the regular expression
 * @param {string | RegExp} regex The string representation of a regular expression or a regular expression
 * @return {string} The string representation of the regular expression
 */
function asStringFrom(regex: string | RegExp): string {
    return typeof regex === 'string' ? regex : regex.source;
}
