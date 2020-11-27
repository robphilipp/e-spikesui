import { timeRangeFrom } from "./TimeRange"

test('should be able to construct a time range', () => {
    const range = timeRangeFrom(3, 11);
    expect(range.start).toEqual(3);
    expect(range.end).toEqual(11);
});

test('when end is less than start time-range should switch them', () => {
    const range = timeRangeFrom(10, 2);
    expect(range.start).toEqual(2);
    expect(range.end).toEqual(10);
});
