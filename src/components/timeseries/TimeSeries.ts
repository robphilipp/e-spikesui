import {Vector, Either} from 'prelude-ts';

export type TimeEvent = [number, number];

/**
 * Represents a named series of events that are ordered by ascending time.
 */
export interface TimeSeries {
    readonly name: string;
    readonly events: Vector<TimeEvent>;
}

/**
 * Creates a named time-series from the events
 * @param name The name of the time-series
 * @param events The events ordered by ascending time
 * @return The series of events
 */
export function asTimeSeries(name: string, events: Vector<TimeEvent>): TimeSeries {
    return {name, events};
}

/**
 * Creates a named time-series from a Vector of times and a Vector of values. The length of the
 * Vector must be the same.
 * @param name The name of the time-series
 * @param times The Vector of times
 * @param values The Vector of values
 * @return Either an error if the Vector sizes don't match, or the time-series.
 */
export function timeSeriesFrom(name: string, times: Vector<number>, values: Vector<number>): Either<string, TimeSeries> {
    if (times.length() !== values.length()) {
        return Either.left(
            `The times and values of the time-events must have the same size; times: ${times.length}; values: ${values.length}`
        );
    }
    return Either.right(asTimeSeries(name, times.zip(values)));
}

/**
 * Creates a named time-series from a list of times and a list of values. The length of the
 * lists must be the same.
 * @param name The name of the time-series
 * @param times The list of times
 * @param values The list of values
 * @return Either an error if the list sizes don't match, or the time-series.
 */
export function timeSeriesFor(name: string, times: Array<number>, values: Array<number>): Either<string, TimeSeries> {
    if (times.length !== values.length) {
        return Either.left(
            `The times and values of the time-events must have the same size; times: ${times.length}; values: ${values.length}`
        );
    }
    return Either.right(asTimeSeries(name, Vector.ofIterable(times).zip(values)));
}
