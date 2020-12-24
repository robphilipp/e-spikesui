import {Observable, Subject} from 'observable-fns';
import {Observable as RxjsObservable} from 'rxjs';
import {expose} from 'threads/worker';
import {compileSensorDescription, SensorOutput} from '../sensors/compiler';
import {WorkerModule} from "threads/dist/types/worker";

// *** NOTE *** (worker thread for generating a stream of sensor signals)
//
// The variables below are global for the worker, and only the worker
let subject: Subject<SensorOutput>;
let neuronIds: Array<string>;
let rxjsObservable: RxjsObservable<SensorOutput>;

/**
 * Compiles the code snippet, returns the neuron IDs from the snippet, and modifies
 * the (worker) global variable with the RxJs observable that, on subscription, generates
 * a stream is sensor signals.
 * @param codeSnippet The code snippet that returns an observable for generating a
 * stream of sensor signals.
 * @return An array of the neuron IDs to which the sensor signals are sent
 */
function compile(codeSnippet: string): Array<string> {
    return compileSensorDescription(codeSnippet)
        .map(result => {
            neuronIds = result.neuronIds;
            rxjsObservable = result.observable;
            
            return neuronIds;
        })
        .getOrElse(undefined)
}

/**
 * @return An observable-fns to which the master thread can subscribe
 */
function observable(): Observable<SensorOutput> {
    subject = new Subject<SensorOutput>();
    return Observable.from<SensorOutput>(subject);
}

/**
 * @return An array holding all the neurons to which sensor signals will be sent
 */
function neurons(): Array<string> {
    return neuronIds;
}

/**
 * Starts the simulation by subscribing to the RxJs observable returned from the
 * compiled code, and updating the Fns observable with the output (effectively
 * streaming the results to the master thread).
 */
function simulate(): void {
    rxjsObservable?.subscribe(output => subject.next(output));
}

/**
 * Attempts to connect to the websocket, subscribes to the RxJs observable returned 
 * from the compiled code, then starts sending the sensor signals down the websocket,
 * and streams the sensor signals to the master thread (in case the master thread 
 * needs the sensor signals).
 * @param websocket The websocket URL
 */
function sendSignals(websocket: string): void {
    // TODO connect to the websocket
    rxjsObservable?.subscribe(output => {
        // TODO send signal down the websocket

        // stream the signal back to the master thread
        subject.next(output);
    })
}

/**
 * Stops the subscription and sets the the subject to undefined
 */
function stop(): void {
    if (subject !== undefined) {
        subject.complete();
        subject = undefined;
    }
}

export interface SensorSignals extends WorkerModule<string> {
    compile: (codeSnippet: string) => Array<string>;
    neurons: () => Array<string>;
    observable: () => Observable<SensorOutput>;
    simulate: () => void;
    sendSignals: (websocket: string) => void;
    stop: () => void;
}

/**
 * The module to expose to the master thread
 */
const simulation: SensorSignals = {
    compile,
    neurons,
    observable,
    simulate,
    sendSignals,
    stop,
}

expose(simulation);
