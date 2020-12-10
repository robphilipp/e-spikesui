import regexFrom from "./regex-combiner";

test('should be able to combine regular expressions', () => {
    const regex1 = /^[a-z]+/;
    const regex2 = /[A-Z]+/;
    const regex3 = /[0-9]+$/g;
    const combined = regexFrom(regex1, regex2, regex3);
    expect(combined.source).toEqual(/^[a-z]+[A-Z]+[0-9]+$/.source);
});

test('should be able to do grouping', () => {
    const middle = /\([a-z]{3}\s*=\s*[a-zA-Z0-9 .\-_]+\)/;
// const newGroupRegex: RegExp = new RegExp(/GRP\s*=\s*\[\s*(\([a-z]{3}\s*=\s*[a-zA-Z0-9 .\-_]+\)\s*,\s*)*\s*\($/);
    const combined = regexFrom("GRP\\s*=\\s*\\[\\s*(", middle, "\\s*,\\s*)*\\s*\\($");
    expect(combined.source).toEqual(/GRP\s*=\s*\[\s*(\([a-z]{3}\s*=\s*[a-zA-Z0-9 .\-_]+\)\s*,\s*)*\s*\($/.source);
});
