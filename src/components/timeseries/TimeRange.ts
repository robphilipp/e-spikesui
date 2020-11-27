/**
 * Represents an immutable time-range
 */
export interface TimeRange {
    readonly start: number;
    readonly end: number;
}

/**
 * Creates an immutable time-range where the start is the smaller number and the end
 * is the larger number
 * @param start The start of the time-range
 * @param end The end of the time-range
 * @return The immutable time-range
 */
export function timeRangeFrom(start: number, end: number): TimeRange {
    if (end < start) {
        return timeRangeFrom(end, start);
    }
    return {start, end};
}
