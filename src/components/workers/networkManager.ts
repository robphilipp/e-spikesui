import {filter, Observable, Subject} from 'observable-fns';
import {Observable as RxjsObservable, Subject as RxjsSubject, Subscription as RxjsSubscription} from 'rxjs';
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
const createBuildMessage = (timeFactor: number) => ({command: "build", timeFactor})
const START_MESSAGE = {command: "start"};
const STOP_MESSAGE = {command: "stop"};

const NEURON = 'neuron';
const CONNECTION = 'connection';
const CONNECTION_WEIGHT = 'learn';
const SPIKE = 'fire';
const NETWORK = 'networkCreated';

type SimulationEvent = typeof SPIKE | typeof CONNECTION_WEIGHT

let repo: NetworkManagementRepo;
let networkId: string | undefined;
let websocket: WebSocket | undefined;
let networkEventObservable: Observable<NetworkEvent> | undefined;

let rxjsSubject: RxjsSubject<SensorOutput>;
let sensorName: string;
let neuronIds: Array<string>;
let rxjsObservable: RxjsObservable<SensorOutput>;
let signalGeneratorSubscription: RxjsSubscription;

interface CompiledResult {
    sensorName: string
    neuronIds: Array<string>
    rxjsObservable: RxjsObservable<SensorOutput>
}

/**
 * Creates an empty sensor compiler result
 * @return an empty sensor compiler result
 */
function emptyResult(): CompiledResult {
    return {sensorName: '', neuronIds: [], rxjsObservable: null}
}

/**
 * Creates the network management repository based on the server settings. The network management
 * repo is used to make REST calls to the server to build the network, obtain the web socket, and
 * delete the network from the server.
 * @param serverSettings The server settings
 * @return An empty promise (as is so often the case in life)
 */
async function configure(serverSettings: ServerSettings): Promise<void> {
    repo = networkManagementRepo(serverSettings)
    return
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
function buildNetwork(timeFactor: number): void {
    if (networkId === undefined) {
        throw new Error("Cannot build network because the network ID is undefined");
    }

    // create the websocket and an observable that listens for websocket messages
    websocket = repo.webSocketFor(networkId);

    const subject = new Subject<NetworkEvent>();
    networkEventObservable = Observable.from(subject);
    if (networkEventObservable === undefined) {
        throw new Error("Unable to create the websocket")
    }

    // set the web-socket callbacks for then the connection is complete and when a message arrives
    websocket.onopen = () => websocket.send(JSON.stringify(createBuildMessage(timeFactor)));
    // websocket.onopen = () => websocket.send(BUILD_MESSAGE.command);
    websocket.onmessage = (event: MessageEvent) => subject.next(JSON.parse(event.data) as NetworkEvent)

    return;
}

/**
 * Compiles the code snippet, returns the neuron IDs from the snippet, and modifies
 * the (worker) global variable with the RxJs observable that, on subscription, generates
 * a stream is sensor signals.
 * @param codeSnippet The code snippet that returns an observable for generating a
 * stream of sensor signals.
 * @param timeFactor The simulation time-factor
 * @return The compiler result, which holds the sensor name, the input neuron IDs to which the sensor signals will
 * be sent, and the rxjsObservable defined in the code-snippet (which is the result of the compilation)
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

            return {sensorName, neuronIds, rxjsObservable};
        })
        .getOrElse(emptyResult())
}

/**
 * Stops the subscription and sets the the subject to undefined
 */
function stop(): void {
    if (rxjsSubject !== undefined) {
        rxjsSubject.complete();
        rxjsSubject = undefined;
    }
}

/**
 * When the network ID and the websocket used to communicate with the server are both defined, then
 * attempts to compile the sensor code-snippet, creates the input neuron selector from the input neuron
 * IDs returned from the compiler, and sets a message with the sensor name and selector down the
 * websocket to the server, which starts the simulation. Then sets the signal generator subscription to the
 * rx-js observable which sends the sensor signals down the web-socket to the server.
 * @param sensorDescription The sensor code-snippet
 * @param timeFactor The simulation time factor (i.e the number of real-time seconds it takes to simulate
 * one second).
 */
function startNetwork(sensorDescription: string, timeFactor: number): void {
    if (networkId === undefined) {
        throw new Error("Cannot start network because network ID is undefined");
    }
    if (websocket === undefined || networkEventObservable === undefined) {
        throw new Error("Cannot start network because the websocket or network-events observable are undefined")
    }

    // compile the sensor code-snippet, which returns the sensor name, the IDs of the input neurons, and
    // the rxjsObservable returned by the function defined in the code-snippet. The rxjsObservable is what
    // emits the sensor signals.
    const {sensorName, neuronIds, rxjsObservable} = compile(sensorDescription, timeFactor);

    // create the regex selector for determining the input neurons for the sensor,
    // required by the back-end
    const selector = neuronIds.map(id => `^${id}$`).join("|")

    // hand the simulator the sensor information, and the send the server the message
    // to start the simulation, create and subscribe to the sensor observables
    // (that will send signals to the network)
    websocket.send(JSON.stringify({name: sensorName, selector: selector}))

    // subscribe to the sensor signal observable to get it to send the signals down the web socket, to the server
    signalGeneratorSubscription = rxjsObservable.subscribe(output => websocket.send(JSON.stringify(output)));

    return;
}

/**
 * Sends a stop message down the web socket to the server, and cleans up.
 */
function stopNetwork(): void {
    websocket?.send(STOP_MESSAGE.command);
    signalGeneratorSubscription?.unsubscribe();

    // clean up
    websocket?.close()
    websocket = undefined;
    networkEventObservable = undefined;
    signalGeneratorSubscription = undefined;
}

/**
 * Attempts to delete the network from the server.
 * @return A promise that the network was delete, holding the network ID of the deleted network
 */
async function deleteNetwork(): Promise<string> {
    await repo.deleteNetwork(networkId);
    const oldId = `${networkId}`;
    networkId = undefined;
    return oldId;
}

/**
 * Returns a network observable that emits the specified event type(s)
 * @param eventType The type of simulation events to return
 * @return a network observable that emits the specified event type(s)
 */
function networkObservable(...eventType: Array<SimulationEvent>): Observable<NetworkEvent> {
    return networkEventObservable.pipe(
        // allow those events through that are part of the specified event types list
        filter(event => eventType.some(evt => evt === event.type))
    )
}

/**
 * Returns an observable that emits network-build events (i.e. neuron created, connection made, and network built)
 * @return An obsevable that emits network-build events
 */
function buildObservable(): Observable<NetworkEvent> {
    return networkEventObservable.pipe(
        filter(message => message.type === NEURON || message.type === CONNECTION || message.type === NETWORK),
    )
}

/**
 * @return The ID of the deployed network, which will be undefined if the network has is not built.
 */
function deployedNetworkId(): string | undefined {
    return networkId;
}

/**
 * Defines the network manager
 */
export interface NetworkManager extends WorkerModule<string> {
    /**
     * Function to configure the network based on the server settings
     * @param serverSettings
     */
    configure: (serverSettings: ServerSettings) => Promise<void>;
    deployNetwork: (networkDescription: string) => Promise<string>;
    buildNetwork: (timeFactor: number) => void;
    startNetwork: (sensorDescription: string, timeFactor: number) => void;
    stopNetwork: () => void;
    deleteNetwork: () => Promise<string>;

    deployedNetworkId: () => string | undefined;
    networkObservable: (...eventType: Array<SimulationEvent>) => Observable<NetworkEvent>;
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
    networkObservable,
    buildObservable
}

expose(manager);