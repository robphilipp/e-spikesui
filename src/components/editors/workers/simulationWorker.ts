import {Observable, Subject} from 'observable-fns';
import {Observable as RxjsObservable} from 'rxjs';
import {expose} from 'threads/worker';
import {compileSensorDescription, SensorOutput} from '../../sensors/compiler';
import {WorkerModule} from "threads/dist/types/worker";


let subject: Subject<SensorOutput>;
let neuronIds: Array<string>;
let rxjsObservable: RxjsObservable<SensorOutput>;


function compile(codeSnippet: string): Array<string> {
    return compileSensorDescription(codeSnippet)
        .map(result => {
            neuronIds = result.neuronIds;
            rxjsObservable = result.observable;
            
            return neuronIds;
        })
        .getOrElse(undefined)
}

function observable(): Observable<SensorOutput> {
    subject = new Subject<SensorOutput>();
    return Observable.from<SensorOutput>(subject);
}

function neurons(): Array<string> {
    return neuronIds;
}

function run(): void {
    rxjsObservable?.subscribe(output => subject.next(output));
}

function stop(): void {
    if (subject !== undefined) {
        subject.complete();
        subject = undefined;
    }
}

export interface SimulationWorker extends WorkerModule<string> {
    compile: (codeSnippet: string) => Array<string>;
    neurons: () => Array<string>;
    observable: () => Observable<SensorOutput>;
    run: () => void;
    stop: () => void;
}

const simulation: SimulationWorker = {
    compile,
    neurons,
    observable,
    run,
    stop,
}

expose(simulation);
