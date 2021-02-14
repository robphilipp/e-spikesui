import { Observable as FnsObservable } from 'observable-fns';
import { SensorOutput } from '../sensors/compiler';
import { Observable } from 'rxjs'
import { ObservablePromise } from 'threads/dist/observable-promise';
import {ModuleMethods, ModuleProxy, PrivateThreadProps, StripAsync} from 'threads/dist/types/master';
import { spawn, Thread, Worker } from 'threads';

type SimulationType = ((...args: never) =>
    ObservablePromise<StripAsync<SensorOutput>>) &
    PrivateThreadProps & ModuleProxy<ModuleMethods>;

export interface SensorThread {
    compileSimulator: (codeSnippet: string, timeFactor: number) => Promise<SignalGenerator>;
    compileSender: (codeSnippet: string, timeFactor: number, websocket: string) => Promise<SignalGenerator>;
    stop: () => Promise<void>;
    terminate: () => Promise<void>;
}

export interface SignalGenerator {
    neuronIds: Array<string>;
    observable: Observable<SensorOutput>;
}

/**
 * Abstracts the worker so that the main code can deal with the thread directly.
 * @return A promise for a sensor thread that has functions for compiling the sensor code,
 * stopping, and terminating the thread.
 */
export async function newSensorThread(): Promise<SensorThread> {

    /**
     * Compiles the sensor code snippet and sets up the observable as a simulator. Has a closure 
     * on the worker.
     * @param codeSnippet The sensor code snippet
     * @param timeFactor The simulation time-factor
     * @return A promise for a signal generator (a set of input neuron IDs and an observable)
     */
    async function compileSimulator(codeSnippet: string, timeFactor: number): Promise<SignalGenerator> {
        const ids = await worker.compile(codeSnippet, timeFactor);
        const fnsObs: FnsObservable<SensorOutput> = worker.observable();
        const observable = new Observable<SensorOutput>(observer => {
            worker.simulate().then(() => fnsObs.subscribe(sensorOutput => observer.next(sensorOutput)));
        });
        return {
            neuronIds: ids,
            observable: observable
        };
    }

    /**
     * Connects to the websocket, compiles the sensor code snippet and sets up the observer 
     * to send sensor signals down the websocket. Has a closure on the worker.
     * @param codeSnippet The sensor code snippet
     * @param timeFactor The simulation time-factor
     * @param websocket The web socket address for sending sensor signals
     * @return A promise for a signal generator (a set of input neuron IDs and an observable)
     */
    async function compileSender(codeSnippet: string, timeFactor: number, websocket: string): Promise<SignalGenerator> {
        const ids = await worker.compile(codeSnippet, timeFactor);
        const fnsObs: FnsObservable<SensorOutput> = worker.observable();
        const observable = new Observable<SensorOutput>(observer => {
            worker.sendSignals(websocket)
                .then(() => fnsObs.subscribe(sensorOutput => observer.next(sensorOutput)));
        });
        return {
            neuronIds: ids,
            observable: observable
        };
    }

    /**
     * Stops sending signals
     * @return An empty promise
     */
    async function stop(): Promise<void> {
        return await worker.stop();
    }

    /**
     * Terminates the worker thread
     */
    async function terminate(): Promise<void> {
        return Thread.terminate(worker);
    }

    const worker: SimulationType = await spawn(new Worker('../workers/sensorSignals'));

    return {
        compileSimulator,
        compileSender,
        stop,
        terminate,
    }
}
