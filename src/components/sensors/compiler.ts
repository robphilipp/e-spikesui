import {Either} from "prelude-ts";
import {Observable, isObservable, interval, pipe} from "rxjs";
import {map, filter} from 'rxjs/operators'
import * as compiler from '@nx-js/compiler-util';

export interface SensorOutput {
    sensorName: string;
    neuronIds: Array<string>;
    signal: {
        units: "µV" | "mV",
        value: number
    };
}

// the observable can be run by subscribing to it; see how to put this into a separate web worker
// todo add compile action, add the observable to the app state
/**
 * Attempts to compile the sensor description code snippet. When successful, returns an
 * `Observable<SensorOutput>` that streams signals to a set of neurons on each event.
 * @param sensorDescription The code snippet that creates the signal stream.
 * @return Either a string with a compile error; or an `Observable<SensorOutput>` representing
 * the compiled sensor description.
 * @example
    function randomSignal(sensorName, neuronIds) {
        const index = Math.floor(Math.random() * neuronIds.length);
        return {
            sensorName: sensorName,
            neuronIds: [neuronIds[index]],
            signal: {value: 1.05, units: 'mV'}
        }
    }

    const sensorName = 'test-sensors';
    const neuronIds = ['in-1', 'in-2', 'in-3', 'in-4'];

    return interval(50).pipe(
        map(time => randomSignal(sensorName, neuronIds)),
    )
 */
export function compileSensorDescription(sensorDescription: string): Either<string, Observable<SensorOutput>> {
    try {
        // attempts to compile the code
        const code = compiler.compileCode(sensorDescription);

        // exposes some basic javascript symbols
        compiler.expose('Math', 'console', 'String', 'Map', 'Set');
        // adds additional sybols for rxjs and regular expressions, etc
        const context = {
            interval: interval,
            pipe: pipe,
            map: map,
            filter: filter,
            RegExp: RegExp,
            // console: console
        };
        const tempVars = {};

        // executing the compiled sensor description yields an observable
        const observable = code(context, tempVars);
        if (isObservable<SensorOutput>(observable)) {
            return Either.right(observable);
        } else {
            return Either.left(
                "Sensor description must return an Observable<{" +
                "sensorName: string, " +
                "neuronIds: string[], " +
                "signal: {value: number, units: 'µV' | 'mV'}" +
                "}>");
        }
    } catch (error) {
        return Either.left(error.message.toString());
    }
}
