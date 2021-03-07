import {Observable, Subject, filter, Subscription} from 'observable-fns';
import {Observable as RxjsObservable} from 'rxjs';
import {expose} from 'threads/worker';
import {WorkerModule} from "threads/dist/types/worker";
import {remoteRepositories} from "../../app";
import {
    CONNECTION,
    NETWORK,
    networkBuildEventsActionCreator,
    NetworkEvent,
    NEURON
} from "../redux/actions/networkEvent";
import {BUILD_MESSAGE, STOP_MESSAGE} from "../redux/actions/networkManagement";
import {newSensorThread, SensorThread, SignalGenerator} from "../threads/SensorThread";
import {SensorOutput} from "../sensors/compiler";

// *** NOTE *** (worker thread for managing the network, sending sensor signals, receiving network events)
//
// The variables below are global for the worker, and only the worker
let networkId: string | undefined;
let websocket: WebSocket | undefined;
let networkEventObservable: Observable<NetworkEvent> | undefined;
let sensorThread: SensorThread | undefined;
let signalGeneratorSubscription: Subscription<SensorOutput>;

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
    return remoteRepositories.networkManagement
        .buildNetwork(networkDescription)
        .then(id => networkId = id);
}

function webSocketObservable(): Observable<NetworkEvent> {
    websocket = remoteRepositories.networkManagement.webSocketFor(networkId);
    const subject = new Subject<NetworkEvent>();
    websocket.onmessage = (event: MessageEvent) => subject.next(JSON.parse(event.data) as NetworkEvent)
    return Observable.from<NetworkEvent>(new Subject<NetworkEvent>());
}

/**
 * Creates a websocket to the server, sends the build command, and returns an observable
 * of network build events. This function has the side effect of setting the worker's global
 * network-event observable
 * @return An observable of network events
 * @throws An error if the network ID is undefined, which means that the network has not
 * been deployed to the server yet.
 */
function buildNetwork(): Observable<NetworkEvent> {
    if (networkId === undefined) {
        throw new Error("Cannot build network because the network ID is undefined");
    }

    // create the websocket and an observable that listens for websocket messages
    networkEventObservable = webSocketObservable();
    if (networkEventObservable === undefined) {
        throw new Error("Unable to create the websocket")
    }

    // send the build command to server so that it starts building the network
    websocket.send(BUILD_MESSAGE.command);

    // emits an observable of network build events from the server
    return networkEventObservable.pipe(
        filter(message => message.type === NEURON || message.type === CONNECTION || message.type === NETWORK),
    );
}

async function startNetwork(sensorDescription: string, timeFactor: number): Promise<Observable<NetworkEvent>> {
    if (networkId === undefined) {
        throw new Error("Cannot start network because network ID is undefined");
    }
    if (websocket === undefined || networkEventObservable === undefined) {
        throw new Error("Cannot start network because the websocket or network-events observable are undefined")
    }

    // create the sensor thread
    sensorThread = await newSensorThread();

    // attempt to compile the sensor code snippet
    // const signalGenerator = await compileSensor(websocket);
    const signalGenerator = await sensorThread.compileSenderForWorker(sensorDescription, timeFactor);

    // create the regex selector for determining the input neurons for the sensor,
    // required by the back-end
    const selector = signalGenerator.neuronIds.map(id => `^${id}$`).join("|")

    // hand the simulator the sensor information, and the send the server the message
    // to start the simulation, create and subscribe to the sensor observables
    // (that will send signals to the network)
    websocket.send(JSON.stringify({name: signalGenerator.sensorName, selector: selector}))

    // await onStartSimulation(websocket, {name: signalGenerator.sensorName, selector: selector});
    signalGeneratorSubscription = signalGenerator
        .observable
        .subscribe(output => websocket.send(JSON.stringify(output)));

    return networkEventObservable;
}

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
    await remoteRepositories.networkManagement.deleteNetwork(networkId);
    const oldId = `${networkId}`;
    networkId = undefined;
    return oldId;
}

function observable(): Observable<NetworkEvent> {
    return networkEventObservable;
}

function deployedNetworkId(): string | undefined {
    return networkId;
}


export interface NetworkManager extends WorkerModule<string> {
    deployNetwork: (networkDescription: string) => Promise<string>;
    buildNetwork: () => Observable<NetworkEvent>;
    startNetwork: (sensorDescription: string, timeFactor: number) => Promise<Observable<NetworkEvent>>;
    stopNetwork: () => void;
    deleteNetwork: () => Promise<string>;

    deployedNetworkId: () => string | undefined;
    observable: () => Observable<NetworkEvent>;
}

const manager: NetworkManager = {
    deployNetwork,
    deployedNetworkId,
    buildNetwork,
    startNetwork,
    stopNetwork,
    observable,
    deleteNetwork,
}

expose(manager);