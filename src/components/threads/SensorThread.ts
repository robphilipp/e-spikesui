import { Observable as FnsObservable } from 'observable-fns';
import { SensorOutput } from '../sensors/compiler';
import { Observable } from 'rxjs'
import { ObservablePromise } from 'threads/dist/observable-promise';
import { ModuleProxy, PrivateThreadProps, StripAsync } from 'threads/dist/types/master';
import { spawn, Thread, Worker } from 'threads';

type SimulationType = (((...args: any) => ObservablePromise<StripAsync<SensorOutput>>) & PrivateThreadProps & ModuleProxy<any>);

// interface CompilerResult {
//     neuronIds: Array<string>;
// }

export interface SensorThread {
    compileSimulator: (codeSnippet: string) => Promise<SignalGenerator>;
    compileSender: (codeSnippet: string, websocket: string) => Promise<SignalGenerator>;
    stop: () => Promise<void>;
    terminate: () => Promise<void>;
}

export interface SignalGenerator {
    neuronIds: Array<string>;
    observable: Observable<SensorOutput>;
}

export async function newSensorThread(): Promise<SensorThread> {

    async function compileSimulator(codeSnippet: string): Promise<SignalGenerator> {
        const ids = await simulation.compile(codeSnippet);
        const fnsObs: FnsObservable<SensorOutput> = simulation.observable();
        const observable = new Observable<SensorOutput>(observer => {
            simulation.simulate().then(() => fnsObs.subscribe(sensorOutput => observer.next(sensorOutput)));
        });
        return {
            neuronIds: ids,
            observable: observable
        };
    }

    async function compileSender(codeSnippet: string, websocket: string): Promise<SignalGenerator> {
        const ids = await simulation.compile(codeSnippet);
        const fnsObs: FnsObservable<SensorOutput> = simulation.observable();
        const observable = new Observable<SensorOutput>(observer => {
            simulation.sendSignals(websocket)
                .then(() => fnsObs.subscribe(sensorOutput => observer.next(sensorOutput)));
        });
        return {
            neuronIds: ids,
            observable: observable
        };
    }

    async function stop(): Promise<void> {
        return await simulation.stop();
    }

    async function terminate(): Promise<void> {
        Thread.terminate(simulation);
    }

    const simulation = await spawn(new Worker('../workers/sensorSignals'));

    return {
        compileSimulator,
        compileSender,
        stop,
        terminate,
    }
    // // TODO move this into the simulation and "runSensor" (when written) method so that
    // //    for the simulation it runs the simulation, for the run-sensor method it writes to
    // //    websocket to send the sensor signals
    // const ids = await simulation.compile(codeSnippet);
    // const fnsObs: FnsObservable<SensorOutput> = simulation.observable();
    // const observable = new Observable<SensorOutput>(observer => {
    //     simulation.simulate().then(() => fnsObs.subscribe(sensorOutput => observer.next(sensorOutput)));
    // });
}
