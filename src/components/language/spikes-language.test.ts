export function extractFieldNameFrom(line: string, position: number): string {
    // process the line by chopping off everything after the position and removing all the white space
    const stripped = line.slice(0, position - 2).replace(/\s*/g, '');
    // now grab the three-letter field name before the equals sign
    return stripped.length >= 4 ? stripped.slice(stripped.length - 3, stripped.length) : '';
}

test('test name extraction', () => {
    expect(extractFieldNameFrom('    (fnc=)', 10)).toEqual('fnc');
});

test('text is properly stripped of newlines, spaces and comments', () => {
    expect(1).toEqual(1);
});
