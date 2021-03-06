import {Either} from "prelude-ts";
import {Observable, isObservable, interval, pipe} from "rxjs";
import {map, filter} from 'rxjs/operators'
import * as compiler from '@nx-js/compiler-util';
import moment from "moment";

/**
 * The output from the sensor
 */
export interface SensorOutput {
    // the name of the sensor
    sensorName: string;
    // an array of neuron IDs to which this signal is sent
    neuronIds: Array<string>;
    // the (optional) signal time (only really needed for simulating the sensor)
    time?: number;
    // the signal sent to the input neurons
    signal: {
        value: number,
        units: "µV" | "mV",
    };
}

/**
 * The result of compiling the sensor code snippet.
 */
export interface CompilerResult {
    // then name of the sensor described by the code
    sensorName: string;
    // an optional array of all the input neurons needed for simulating the sensor
    neuronIds?: Array<string>;
    // the observable that generates the sensor signals for the input neurons
    observable: Observable<SensorOutput>;
}

// the observable can be run by subscribing to it; see how to put this into a separate web worker
// todo add compile action, add the observable to the app state
/**
 * Attempts to compile the sensor description code snippet. When successful, returns an
 * `Observable<SensorOutput>` that streams signals to a set of neurons on each event.
 * @param sensorDescription The code snippet that creates the signal stream.
 * @param timeFactor The simulation time-factor
 * @return Either a string with a compile error; or an `Observable<SensorOutput>` representing
 * the compiled sensor description.
 * @example
    function randomSignal(sensorName, neuronIds) {
        const index = Math.floor(Math.random() * neuronIds.length);
        return {
            sensorName: sensorName,
            neuronIds: [neuronIds[index]],
            signal: {value: 1.05 * Math.random(), units: 'mV'}
        }
    }

    const sensorName = 'test-sensors';
    const neuronIds = ['in-1', 'in-2', 'in-3', 'in-4'];

    const observable =  interval(timeFactor * 50).pipe(
        map(() => randomSignal(sensorName, neuronIds)),
    )

    return {sensorName, neuronIds, observable};
 */
export function compileSensorDescription(sensorDescription: string, timeFactor: number): Either<string, CompilerResult> {
    try {
        // attempts to compile the code
        const code = compiler.compileCode(sensorDescription);

        // exposes some basic javascript symbols
        compiler.expose('Math', 'console', 'String', 'Map', 'Set');
        // adds additional symbols for rxjs and regular expressions, etc
        const context = {
            interval: interval,
            pipe: pipe,
            map: map,
            filter: filter,
            RegExp: RegExp,
            Date: Date,
            moment: moment,
            timeFactor: timeFactor
        };
        const tempVars = {};

        // executing the compiled sensor description yields an observable
        const {sensorName, neuronIds, observable} = code(context, tempVars);
        if (isObservable<SensorOutput>(observable)) {
            return Either.right({sensorName, neuronIds, observable});
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
