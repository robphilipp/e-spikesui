import {Observable, Subject, filter, Subscription} from 'observable-fns';
import {Observable as RxjsObservable} from 'rxjs';
import {expose} from 'threads/worker';
import {WorkerModule} from "threads/dist/types/worker";
import {NetworkEvent} from "../redux/actions/networkEvent";
import {compileSensorDescription, SensorOutput} from "../sensors/compiler";
import {networkManagementRepo, NetworkManagementRepo} from "../repos/networkManagementRepo";
import ServerSettings from "../settings/serverSettings";


// *** NOTE *** (worker thread for managing the network, sending sensor signals, receiving network events)
//
// The variables below are global for the worker, and only the worker
const BUILD_MESSAGE = {command: "build"};
const START_MESSAGE = {command: "start"};
const STOP_MESSAGE = {command: "stop"};

const NEURON = 'neuron';
const CONNECTION = 'connection';
const CONNECTION_WEIGHT = 'learn';
const SPIKE = 'fire';
const NETWORK = 'networkCreated';

let repo: NetworkManagementRepo;
let networkId: string | undefined;
let websocket: WebSocket | undefined;
let networkEventObservable: Observable<NetworkEvent> | undefined;
let buildEventsObservable:  Observable<NetworkEvent> | undefined;
// // let sensorThread: SensorThread | undefined;
let signalGeneratorSubscription: Subscription<SensorOutput>;

let subject: Subject<SensorOutput>;
let sensorName: string;
let neuronIds: Array<string>;
let rxjsObservable: RxjsObservable<SensorOutput>;

interface CompiledResult {
    sensorName: string;
    neuronIds: Array<string>;
}

function emptyResult(): CompiledResult {
    return {sensorName: '', neuronIds: []}
}

// interface SignalGeneratorForWorker {
//     sensorName: string;
//     neuronIds: Array<string>;
//     timeFactor: number;
//     observable: Observable<SensorOutput>;
// }
//
async function configure(serverSettings: ServerSettings): Promise<void> {
    repo = networkManagementRepo(serverSettings);
    return;
}

/**
 * Deploys the network to the server and sets the network ID and returns the promise.
 * Function has side effect of setting the worker's global network ID
 * @param networkDescription The network description to deploy
 * @return The network ID of the deployed network
 * @throws If the network ID is not undefined because network must be deleted first
 */
async function deployNetwork(networkDescription: string): Promise<string> {
    if (networkId) {
        throw new Error(`Cannot deploy network because a network is already deployed; network ID: ${networkId}`)
    }
    return repo.buildNetwork(networkDescription).then(id => networkId = id);
}

/**
 * Creates a websocket to the server, sends the build command, and returns an observable
 * of network build events. This function has the side effect of setting the worker's global
 * network-event observable
 * @return An observable of network events
 * @throws An error if the network ID is undefined, which means that the network has not
 * been deployed to the server yet.
 */
function buildNetwork(): void {
    if (networkId === undefined) {
        throw new Error("Cannot build network because the network ID is undefined");
    }

    // create the websocket and an observable that listens for websocket messages
    websocket = repo.rawWebSocketFor(networkId);

    const subject = new Subject<NetworkEvent>();
    networkEventObservable = Observable.from(subject);
    if (networkEventObservable === undefined) {
        throw new Error("Unable to create the websocket")
    }

    // set the web-socket callbacks for then the connection is complete and when a message arrives
    websocket.onopen = () => websocket.send(BUILD_MESSAGE.command);
    websocket.onmessage = (event: MessageEvent) => subject.next(JSON.parse(event.data) as NetworkEvent)

    // set the observable that only sends back build events
    buildEventsObservable = networkEventObservable.pipe(
        filter(message => message.type === NEURON || message.type === CONNECTION || message.type === NETWORK),
    );
    return;
}

/**
 * Compiles the code snippet, returns the neuron IDs from the snippet, and modifies
 * the (worker) global variable with the RxJs observable that, on subscription, generates
 * a stream is sensor signals.
 * @param codeSnippet The code snippet that returns an observable for generating a
 * stream of sensor signals.
 * @param timeFactor The simulation time-factor
 * @return An array of the neuron IDs to which the sensor signals are sent
 */
function compile(codeSnippet: string, timeFactor: number): CompiledResult {
    const result = compileSensorDescription(codeSnippet, timeFactor);
    if (result.isLeft()) {
        throw new Error(result.getLeft());
    }
    return result
        .map(result => {
            sensorName = result.sensorName;
            neuronIds = result.neuronIds;
            rxjsObservable = result.observable;

            return {sensorName, neuronIds};
        })
        .getOrElse(emptyResult())
}

/**
 * Attempts to connect to the websocket, subscribes to the RxJs observable returned
 * from the compiled code, then starts sending the sensor signals down the websocket,
 * and streams the sensor signals to the master thread (in case the master thread
 * needs the sensor signals).
 */
function sendSignals(): void {
    // TODO connect to the websocket
    console.log("starting to send signals")
    rxjsObservable?.subscribe(output => {
        // TODO send signal down the websocket
        // websocket.next(JSON.stringify(output));
        // console.log(output);
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

async function startNetwork(sensorDescription: string, timeFactor: number): Promise<Observable<NetworkEvent>> {
    if (networkId === undefined) {
        throw new Error("Cannot start network because network ID is undefined");
    }
    if (websocket === undefined || networkEventObservable === undefined) {
        throw new Error("Cannot start network because the websocket or network-events observable are undefined")
    }

    // const worker: SimulationType = await spawn(new Worker('./sensorSignals'));

    const {sensorName, neuronIds} = compile(sensorDescription, timeFactor);
    subject = new Subject<SensorOutput>();
    const fnsObs: Observable<SensorOutput> = Observable.from<SensorOutput>(subject);

    sendSignals();
    const observable = new Observable<SensorOutput>(observer => {
        fnsObs.subscribe(sensorOutput => observer.next(sensorOutput))
    });

    // create the regex selector for determining the input neurons for the sensor,
    // required by the back-end
    const selector = neuronIds.map(id => `^${id}$`).join("|")

    // hand the simulator the sensor information, and the send the server the message
    // to start the simulation, create and subscribe to the sensor observables
    // (that will send signals to the network)
    websocket.send(JSON.stringify({name: sensorName, selector: selector}))

    // await onStartSimulation(websocket, {name: signalGenerator.sensorName, selector: selector});
    signalGeneratorSubscription = observable
        .subscribe(output => websocket.send(JSON.stringify(output)));

    return networkEventObservable;
}
// async function startNetwork(sensorDescription: string, timeFactor: number): Promise<Observable<NetworkEvent>> {
//     if (networkId === undefined) {
//         throw new Error("Cannot start network because network ID is undefined");
//     }
//     if (websocket === undefined || networkEventObservable === undefined) {
//         throw new Error("Cannot start network because the websocket or network-events observable are undefined")
//     }
//
//     // const worker: SimulationType = await spawn(new Worker('./sensorSignals'));
//
//     const {sensorName, neuronIds} = compile(sensorDescription, timeFactor);
//     subject = new Subject<SensorOutput>();
//     const fnsObs: Observable<SensorOutput> = Observable.from<SensorOutput>(subject);
//
//     sendSignals();
//     const observable = new Observable<SensorOutput>(observer => {
//         fnsObs.subscribe(sensorOutput => observer.next(sensorOutput))
//     });
//
//     // create the regex selector for determining the input neurons for the sensor,
//     // required by the back-end
//     const selector = neuronIds.map(id => `^${id}$`).join("|")
//
//     // hand the simulator the sensor information, and the send the server the message
//     // to start the simulation, create and subscribe to the sensor observables
//     // (that will send signals to the network)
//     websocket.send(JSON.stringify({name: sensorName, selector: selector}))
//
//     // await onStartSimulation(websocket, {name: signalGenerator.sensorName, selector: selector});
//     signalGeneratorSubscription = observable
//         .subscribe(output => websocket.send(JSON.stringify(output)));
//
//     return networkEventObservable;
// }

function stopNetwork(): void {
    websocket.send(STOP_MESSAGE.command);
    signalGeneratorSubscription.unsubscribe();

    // clean up
    websocket.close()
    websocket = undefined;
    networkEventObservable = undefined;
    signalGeneratorSubscription = undefined;
}

async function deleteNetwork(): Promise<string> {
    await repo.deleteNetwork(networkId);
    const oldId = `${networkId}`;
    networkId = undefined;
    return oldId;
}

function observable(): Observable<NetworkEvent> {
    return networkEventObservable;
}

function buildObservable(): Observable<NetworkEvent> {
    return buildEventsObservable;
}

function deployedNetworkId(): string | undefined {
    return networkId;
}


export interface NetworkManager extends WorkerModule<string> {
    configure: (serverSettings: ServerSettings) => Promise<void>;
    deployNetwork: (networkDescription: string) => Promise<string>;
    buildNetwork: () => void;
    // buildNetwork: () => Observable<NetworkEvent>;
    // buildNetwork: () => Promise<Observable<NetworkEvent>>;
    startNetwork: (sensorDescription: string, timeFactor: number) => Promise<Observable<NetworkEvent>>;
    stopNetwork: () => void;
    deleteNetwork: () => Promise<string>;

    deployedNetworkId: () => string | undefined;
    observable: () => Observable<NetworkEvent>;
    buildObservable: () => Observable<NetworkEvent>;
}

const manager: NetworkManager = {
    configure,
    deployNetwork,
    buildNetwork,
    startNetwork,
    deleteNetwork,
    stopNetwork,

    deployedNetworkId,
    observable,
    buildObservable
}

expose(manager);