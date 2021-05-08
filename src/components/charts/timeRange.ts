/**
 * The time-range contract
 */
export interface TimeRange {
    readonly start: number;
    readonly end: number;
    readonly scaleFactor: number;
    readonly matchesOriginal: (start: number, end: number) => boolean;
    readonly scale: (factor: number, time: number) => TimeRange;
    readonly translate: (x: number) => TimeRange;
}

/**
 * A time-range that can be scaled and transformed, all the while maintaining it original range values.
 * @param _start The start of the time-range
 * @param _end The end of the time-range
 * @return A time-range object that can be scaled and transformed
 */
export function timeRangeFor(_start: number, _end: number): TimeRange {
    // form a closure on the original start and end of the time-range
    const originalStart: number = Math.min(_start, _end);
    const originalEnd: number = Math.max(_start, _end);

    /**
     * Updates the time-range based on the new start and end times, and has a closure on the original
     * start and end times.
     * @param start The new start of the time-range
     * @param end The new end of the time-range
     * @return The updated time-range type
     */
    function updateTimeRange(start: number, end: number): TimeRange {

        // the amount by which the time-range is currently scaled
        const scaleFactor = (end - start) / (originalEnd - originalStart);

        /**
         * Determines whether the specified (start, end) interval matches the original interval
         * @param start The start of the interval
         * @param end The end of the interval
         * @return `true` if the specified interval matches the original interval; `false` otherwise
         */
        function matchesOriginal(start: number, end: number): boolean {
            return originalStart === start && originalEnd === end;
        }

        /**
         * Scales the time-range by the specified scale factor from the specified time-location. The equations
         * are written so that the zooming (scaling) occurs at the specified time, and expands/contracts equally
         * from that time.
         * @param factor The scale factor
         * @param time The time from which to scale the interval
         */
        function scale(factor: number, time: number): TimeRange {
            const oldScale = scaleFactor;
            const dts = time - start;
            const dte = end - time;
            start = time - dts * factor / oldScale;
            end = time + dte * factor / oldScale;
            return updateTimeRange(start, end);
        }

        /**
         * Translates the time-range by the specified amount
         * @param x The amount by which to translate the time-range
         * @return The a new time-range that is translated by x time units
         */
        function translate(x: number): TimeRange {
            start += x;
            end += x;
            return updateTimeRange(start, end);
        }

        return {
            start,
            end,
            matchesOriginal,
            scaleFactor,
            scale,
            translate
        }
    }

    return updateTimeRange(originalStart, originalEnd);
}
