import {ThunkAction, ThunkDispatch} from "redux-thunk";
import {Either} from "prelude-ts";
import axios, {AxiosResponse} from "axios";
import {WebSocketSubject} from "rxjs/internal-compatibility";
import {webSocket} from "rxjs/webSocket";
import {merge, Observable, Subject, Subscription} from "rxjs";
import {
    bufferTime,
    bufferToggle,
    distinctUntilChanged,
    filter,
    flatMap, map, mergeMap,
    multicast,
    refCount,
    share,
    windowToggle
} from "rxjs/operators";
import {TimeRange, timeRangeFrom} from "../../timeseries/TimeRange";
import {List, Map} from "immutable";
import {TimeEvent, TimeSeries} from "../../timeseries/TimeSeries";
import {NetworkEvent} from "./networkEvent";
import ServerSettings from "../../settings/serverSettings";
import {noop} from "../../../commons";

/**
 * Actions for managing the network. For example, actions for updating the
 * network description, building/deleting the network, starting/stopping
 * the network, managing the websocket connections, and managing rxjs subscriptions.
 */

/*
 |
 | Action names (for use by actions, redux action creators, and reducers)
 |
 */

export const NETWORK_DESCRIPTION_CHANGED = "network-description-changed";
export const NETWORK_DESCRIPTION_LOADED = "network-description-loaded";
export const NETWORK_BUILT = "network-built";
export const NETWORK_DELETED = "network-deleted";
// rxjs web-socket creation operator returns a web-socket subject. when the call is made
// to subscribe to the web-socket subject, then rxjs attempts to open the websocket connection
export const WEBSOCKET_SUBJECT_CREATED = "websocket-subject-created";
// creates an observable using the web-socket subject as an observer. In this way, when a call
// is made to this observable to subscribe, rxjs will attempt to connect to the web-socket
export const NETWORK_EVENTS_OBSERVABLE_CREATE = "network-events-observable-created";
export const WEBSOCKET_SUBSCRIBED = "websocket-subscribed";
export const WEBSOCKET_UNSUBSCRIBED = "websocket-unsubscribed";

export const SIMULATION_STARTED = "simulation-started";
export const SIMULATION_STOPPED = "simulation-stopped";
export const SIMULATION_PAUSED = "simulation-paused";

/*
 |
 | Action definitions (for use by the reducers)
 |
 */

/**
 * The definition of an action that is dispatched when the network description has changed
 */
export interface NetworkDescriptionChangedAction {
    type: typeof NETWORK_DESCRIPTION_CHANGED;
    networkDescription: string;
}

/**
 * The response-action types
 */
export type ResponseActionType = typeof NETWORK_DESCRIPTION_LOADED |
    typeof NETWORK_BUILT |
    typeof NETWORK_DELETED
    ;

/**
 * Generic action to a response that is either a success of failure. For example, a call to load
 * the network description from a file can either succeed or fail. In this case, the response
 * action would be a `NETWORK_DESCRIPTION_LOADED` action type, and the ResponseAction would be
 * a `NetworkDescriptionLoadedAction`.
 */
export interface ResponseAction<T extends ResponseActionType> {
    type: T;
    result: Either<string[], string>
}

/**
 * The definition of an action that is dispatched when the network description is loaded. This
 * can result in either a success (either.right) or a failure (either.left). When the result is
 * a success, then the right-side holds the network description. When the result is a failure,
 * then the left side holds the array of error messages.
 */
export type NetworkDescriptionLoadedAction = ResponseAction<typeof NETWORK_DESCRIPTION_LOADED>;

/**
 * The definition of an action that is dispatched when a network has been built. This
 * can result in either a success (either.right) or a failure (either.left). When the result is
 * a success, then the right-side holds the network ID. When the result is a failure,
 * then the left side holds the array of error messages.
 */
export type NetworkBuiltAction = ResponseAction<typeof NETWORK_BUILT>;

/**
 * The definition of an action that is dispatched whan a network has been deleted
 */
export type NetworkDeletedAction = ResponseAction<typeof NETWORK_DELETED>;

/**
 * The definition of an action that is dispatched when the websocket for receiving spiking-network events
 * is initialized.
 */
export interface WebsocketCreatedAction {
    type: typeof WEBSOCKET_SUBJECT_CREATED;
    webSocketSubject: WebSocketSubject<string>;
}

/**
 * The definition of an action that is dispatched when the websocket for receiving spiking-network events
 * is initialized.
 */
export interface CreateNetworkObservableAction {
    type: typeof NETWORK_EVENTS_OBSERVABLE_CREATE;
    observable: Observable<NetworkEvent>;
    pauseSubject: Subject<boolean>;
}

/**
 * Action to subscribe to the websocket
 */
export interface SubscribeWebsocketAction {
    type: typeof WEBSOCKET_SUBSCRIBED;
    time: number;
    timeRange: TimeRange;
    // events: Map<string, TimeEvents>;
    events: Map<string, List<TimeEvent>>;
    timeSeries: Map<string, TimeSeries>;
    subscription: Subscription;
    pauseSubscription: Subscription;
}

/**
 * Action to unsubscribe from the websocket
 */
export interface UnsubscribeWebsocketAction {
    type: typeof WEBSOCKET_UNSUBSCRIBED;
}

/**
 * Action to start the simulation
 */
export interface StartSimulationAction {
    type: typeof SIMULATION_STARTED;
}

/**
 * Action to start the simulation
 */
export interface StopSimulationAction {
    type: typeof SIMULATION_STOPPED;
}

/**
 * Action when the simulation is paused
 */
export interface PauseSimulationAction {
    type: typeof SIMULATION_PAUSED;
    paused: boolean;
}

export type NetworkManagementAction = NetworkDescriptionChangedAction
    | NetworkBuiltAction
    | NetworkDeletedAction

    | WebsocketCreatedAction
    | CreateNetworkObservableAction
    | SubscribeWebsocketAction
    | UnsubscribeWebsocketAction

    | StartSimulationAction
    | StopSimulationAction
    | PauseSimulationAction
    ;

/*
 |
 | Redux action creators (for use by the components)
 | (functions that return actions or they return a thunk (a function that returns an action))
 |
 */

export const BUILD_MESSAGE = {command: "build"};
export const START_MESSAGE = {command: "start"};
export const STOP_MESSAGE = {command: "stop"};

/**
 * Wraps around the action creators, forming a closure on the network settings
 * @param {ServerSettings} serverSettings The server host and port against which to make calls
 * @return {{networkDescriptionUpdate: (networkDescription: string) => NetworkDescriptionChangedAction; stopSimulation: (websocket: WebSocketSubject<string>) => ThunkAction<Promise<StopSimulationAction>, any, any, StopSimulationAction>; webSocketSubject: (networkId: string) => CreateWebsocketAction; buildNetwork: (networkDescription: string) => ThunkAction<Promise<NetworkBuiltAction>, any, any, NetworkBuiltAction>; subscribe: (observable: Observable<NetworkEvent>, timeWindow: number, messageProcessor: (messages: NetworkEvent) => void, pauseSubject: Subject<boolean>, paused: boolean) => ThunkAction<Promise<SubscribeWebsocketAction>, any, any, SubscribeWebsocketAction>; unsubscribe: (subscription: Subscription, pauseSubscription: Subscription) => ThunkAction<Promise<UnsubscribeWebsocketAction>, any, any, UnsubscribeWebsocketAction>; networkEventsObservable: (websocket: WebSocketSubject<string>, bufferInterval: number) => CreateNetworkObservableAction; pauseSimulation: (pause: boolean, pauseSubject: Subject<boolean>) => PauseSimulationAction; loadNetworkDescription: (networkDescriptionFile: File) => ThunkAction<Promise<NetworkDescriptionLoadedAction>, any, any, NetworkDescriptionLoadedAction>; startSimulation: (websocket: WebSocketSubject<string>) => ThunkAction<Promise<StartSimulationAction>, any, any, StartSimulationAction>; deleteNetwork: (networkId: string) => ThunkAction<Promise<NetworkDeletedAction>, any, any, NetworkDeletedAction>}}
 */
export function networkManagementActionCreators(serverSettings: ServerSettings) {
    /* **--< WARNING >--**
     | changing this to a thunk action breaks the editing...each character sends the cursor to the
     | bottom of the text field. Further experimentation reveals that even when this plain action
     | is wrapped in a Promise (i.e. Promise.resolve().then(() => networkDescriptionUpdate(description)))
     | that editing no longer works as expected.
     */
    /**
     * Returns an action that the network description has been updated.
     * @param {string} networkDescription The updated network description
     * @return {NetworkDescriptionChangedAction} The action with the updated network description
     */
    function networkDescriptionUpdate(networkDescription: string): NetworkDescriptionChangedAction {
        return ({
            type: NETWORK_DESCRIPTION_CHANGED,
            networkDescription: networkDescription
        });
    }

    /**
     * When an action response was a failure, creates an action that represents that failure. Holds the response
     * action type and the failure/error messages.
     * @param {string[]} messages An array of error messages
     * @param {ResponseActionType} actionType The response type, which determines the action that is created. For
     * example, if the action type is `NETWORK_BUILT`, then a NetworkBuiltAction is created
     * @return {ResponseAction<T>} The action that the response of an attempted action have been received. For
     * example, if the action was to build a network, then this is called if that request failed
     * @private
     */
    function failedAction<T extends ResponseActionType>(actionType: T, messages: string[]): ResponseAction<T> {
        return {
            type: actionType,
            result: Either.left(messages)
        }
    }

    /**
     * When an action response was a success, creates an action that represents that success. Holds the response
     * action type and result string.
     * @param {string} result The result represented as a string (for example, this could be the network ID)
     * @param {ResponseActionType} actionType The response type, which determines the action that is created. For
     * example, if the action type is `NETWORK_BUILT`, then a NetworkBuiltAction is created
     * @return {ResponseAction<T>} The action that the response of an attempted action have been received. For
     * example, if the action was to build a network, then this is called if that request succeeded.
     * @private
     */
    function successAction<T extends ResponseActionType>(actionType: T, result: string): ResponseAction<T> {
        return {
            type: actionType,
            result: Either.right(result)
        }
    }

    /**
     * Action creator the loads the network description file and dispatches the network loaded action. Note that
     * the action contains the results as an Either<string[], string> where the right is the successfully loaded
     * network description and the left is the failure messages
     * @param {File} networkDescriptionFile The handle of the file containing the network description
     * @return {ThunkAction<Promise<NetworkDescriptionLoadedAction>, object, object, NetworkDescriptionLoadedAction>}
     */
    function loadNetworkDescription(networkDescriptionFile: File):
        ThunkAction<Promise<NetworkDescriptionLoadedAction>, any, any, NetworkDescriptionLoadedAction> {

        return (dispatch: ThunkDispatch<any, any, NetworkDescriptionLoadedAction>): Promise<NetworkDescriptionLoadedAction> => {
            return new Promise((resolve, reject) => {

                    // open a file reader and read the file asynchronously
                    const fileReader = new FileReader();
                    fileReader.readAsText(networkDescriptionFile);

                    // once the file is loaded, the file reader will call the resolve method
                    fileReader.onloadend = () => resolve(fileReader.result as string);
                    fileReader.onerror = event => reject(event)
                })
                .then((networkDescription) => dispatch(successAction(NETWORK_DESCRIPTION_LOADED, networkDescription as string)))
                .catch(reason => dispatch(failedAction(NETWORK_DESCRIPTION_LOADED, reason)))
                ;
        }
    }

    /**
     * Action creator that makes a REST call to the server to build the spikes network and return information
     * about that network and a network ID.
     * @param {string} networkDescription The network description in the `boo` language
     * @return {ThunkAction<Promise<NetworkBuiltAction>, any, any, NetworkBuiltAction>} The thunk action, holding a promise
     * to the action to build the network.
     */
    function buildNetwork(networkDescription: string): ThunkAction<Promise<NetworkBuiltAction>, any, any, NetworkBuiltAction> {

        return (dispatch: ThunkDispatch<any, any, NetworkBuiltAction>): Promise<NetworkBuiltAction> => {
            return axios
                .post(
                    `http://${serverSettings.host}:${serverSettings.port}/network-management/network`,
                    {
                        networkDescription: networkDescription,
                        kafkaSettings: {
                            bootstrapServers: [
                                {host: 'localhost', port: 9092}
                            ]
                        }
                    }
                )
                .then((response: AxiosResponse<any>) => dispatch(successAction(NETWORK_BUILT, response.data.id)))
                .catch((reason: any) => dispatch(failedAction(NETWORK_BUILT, reason)))
                ;
        }
    }

    /**
     * Action creator that makes a REST call to delete the network from the backend server
     * @param {string} networkId The ID of the network to delete
     * @return {ThunkAction<Promise<NetworkDeletedAction>, any, any, NetworkDeletedAction>} The thunk action, holding a promise
     * to the action to delete the network.
     */
    function deleteNetwork(networkId: string): ThunkAction<Promise<NetworkDeletedAction>, any, any, NetworkDeletedAction> {
        return (dispatch: ThunkDispatch<any, any, NetworkDeletedAction>): Promise<NetworkDeletedAction> => {
            return axios
                .delete(`http://${serverSettings.host}:${serverSettings.port}/network-management/network/${networkId}`)
                .then((_: AxiosResponse<any>) => dispatch(successAction(NETWORK_DELETED, networkId)))
                .catch((reason: any) => dispatch(failedAction(NETWORK_DELETED, reason)))
                ;
        }
    }

    // /**
    //  * Opens the websocket
    //  * @param {string} networkId The ID of the spikes network
    //  * @param {string} host The host name or IP of the websocket server
    //  * @param {number} port The port on which the websocket listens
    //  * @return {ThunkAction<Promise<CreateWebsocketAction>, any, any, CreateWebsocketAction>}
    //  * @deprecated
    //  */
    // export function openWebsocket(networkId: string, host: string, port: number):
    //     ThunkAction<Promise<CreateWebsocketAction>, any, any, CreateWebsocketAction> {
    //     return (dispatch: ThunkDispatch<any, any, CreateWebsocketAction>): Promise<CreateWebsocketAction> => {
    //         return Promise.resolve().then(() => dispatch(webSocketSubject(networkId, host, port)))
    //     }
    // }

    /**
     * Creates a web-socket subject that attempts to connect when the subject is subscribed.
     * @param {string} networkId The ID of the spikes network
     * @return {WebsocketCreatedAction} The open web-socket action holding the web-socket subject
     * @see WebSocketSubject
     */
    function webSocketSubject(networkId: string): WebsocketCreatedAction {
        // create the rxjs subject that connects to the web-socket
        const webSocketSubject: WebSocketSubject<string> = webSocket({
            url: `ws://${serverSettings.host}:${serverSettings.port}/web-socket/${networkId}`,
            deserializer: e => e.data
        });

        return {
            type: WEBSOCKET_SUBJECT_CREATED,
            webSocketSubject: webSocketSubject
        }
    }

    // /**
    //  * Initializes the web-socket and creates a rxjs flow for a stream that can be paused.
    //  * @param {WebSocketSubject<string>} websocket The websocket subject
    //  * @param {number} bufferInterval The number of milliseconds for which to buffer before updating
    //  * @return {Observable<string[]>} The web-socket observable that accepts string[] as messages
    //  * @deprecated
    //  */
    // export function initializeWebsocket(websocket: WebSocketSubject<string>, bufferInterval: number):
    //     ThunkAction<Promise<CreateNetworkObservableAction>, any, any, AnyAction> {
    //
    //     return (dispatch: ThunkDispatch<any, any, CreateNetworkObservableAction>): Promise<CreateNetworkObservableAction> => {
    //         return Promise.resolve().then(() => dispatch(networkEventsObservable(websocket, bufferInterval)));
    //     }
    // }

    /**
     * Initializes the web-socket and creates a rxjs flow for a stream that can be paused.
     * @param {WebSocketSubject<string>} websocket The websocket subject
     * @param {number} bufferInterval The number of milliseconds for which to buffer before updating
     * @return {Observable<string[]>} The web-socket observable that accepts string[] as messages
     */
    function networkEventsObservable(websocket: WebSocketSubject<string>, bufferInterval: number): CreateNetworkObservableAction {

        // create flows that filter values depending on the state of "paused",
        // which is the value "running". On subscription to the pause-subject, a value
        // is sent down the flow that tells the filters that it is not being paused
        const pauseSubject = new Subject<boolean>();
        const pause: Observable<boolean> = pauseSubject.pipe(distinctUntilChanged(), share());
        const paused: Observable<boolean> = pause.pipe(filter(running => !running));
        const resumed: Observable<boolean> = pause.pipe(filter(running => running));

        // create the multiplexed source that sends a message to the web-socket server.
        // on subscription, sends message to build the network, which will cause the server
        // to build the network and stream back the network creation events (created neuron,
        // connected neuron).
        const source: Observable<string> = websocket.multiplex(
            noop,
            () => STOP_MESSAGE.command,
            () => true
        );

        // creates a multicast-ed observable so that multiple components can subscribe
        // and receive messages on the same websocket.
        // merges the filter flows so that when the pause button is pressed, the incoming
        // messages are all buffered by the buffer toggle, and when the resume button is
        // pressed, the window toggle pushes all those through to the timed-buffer
        const observable = merge(
            source.pipe(bufferToggle(paused, () => resumed)),
            source.pipe(windowToggle(resumed, () => paused))
        ).pipe(
            flatMap(message => message),
            // accumulate message for the time specified in the buffer interval
            bufferTime(bufferInterval),
            // only call the message processor when there are accumulated messages
            filter(messages => messages.length > 0),
            // turn this into a multicast-ed observable
            multicast(new Subject<Array<string>>()),
            // reference count so that it executes when the first observer subscribes,
            // and completes when the last observer unsubscribes.
            refCount(),
            // merge the message-arrays into a stream of individual messages
            mergeMap(messages => messages),
            // convert each message to a network event
            map(message => JSON.parse(message) as NetworkEvent)
        );


        return {
            type: NETWORK_EVENTS_OBSERVABLE_CREATE,
            observable: observable,
            pauseSubject: pauseSubject
        };
    }

    /**
     * todo need to update the "error" and "complete" callbacks in the observable.subscribe(...)
     * Subscribes to the observable that listens for messages on the websocket, and to the subject
     * used for pausing the message processing
     * @param {Observable<string[]>} observable The observable attached to the websocket
     * @param {number} timeWindow The time window
     * @param {(messages: string[]) => void} eventProcessor The message processor
     * @param {Subject<boolean>} pauseSubject The observable for pausing the message processing
     * @param {boolean} paused `true` when paused; `false` when running
     * @return {ThunkAction<Promise<SubscribeWebsocketAction>, any, any, SubscribeWebsocketAction>}
     */
    function subscribe(observable: Observable<Array<NetworkEvent>>,
                       timeWindow: number,
                       eventProcessor: (messages: Array<NetworkEvent>) => void,
                       pauseSubject: Subject<boolean>,
                       paused: boolean
    ): ThunkAction<Promise<SubscribeWebsocketAction>, any, any, SubscribeWebsocketAction> {

        return (dispatch: ThunkDispatch<any, any, SubscribeWebsocketAction>): Promise<SubscribeWebsocketAction> => {
            return Promise.resolve().then(() => {
                const subscription = observable.subscribe({
                    next: event => eventProcessor(event),
                    error: error => console.error(error),
                    complete: () => console.info('subscription closed')
                });

                const pauseSubscription = pauseSubject.subscribe();
                pauseSubject.next(!paused);

                return dispatch({
                    type: WEBSOCKET_SUBSCRIBED,
                    time: 0,
                    // timeRange: new TimeRange(0, timeWindow),
                    timeRange: timeRangeFrom(0, timeWindow),
                    // events: Map<string, TimeEvents>(),
                    events: Map<string, List<TimeEvent>>(),
                    timeSeries: Map<string, TimeSeries>(),
                    subscription: subscription,
                    pauseSubscription: pauseSubscription
                })
            })
        }
    }
    // /**
    //  * todo need to update the "error" and "complete" callbacks in the observable.subscribe(...)
    //  * Subscribes to the observable that listens for messages on the websocket, and to the subject
    //  * used for pausing the message processing
    //  * @param {Observable<string[]>} observable The observable attached to the websocket
    //  * @param {number} timeWindow The time window
    //  * @param {(messages: string[]) => void} messageProcessor The message processor
    //  * @param {Subject<boolean>} pauseSubject The observable for pausing the message processing
    //  * @param {boolean} paused `true` when paused; `false` when running
    //  * @return {ThunkAction<Promise<SubscribeWebsocketAction>, any, any, SubscribeWebsocketAction>}
    //  */
    // function subscribe(observable: Observable<NetworkEvent>,
    //                    timeWindow: number,
    //                    messageProcessor: (messages: NetworkEvent) => void,
    //                    pauseSubject: Subject<boolean>,
    //                    paused: boolean
    // ): ThunkAction<Promise<SubscribeWebsocketAction>, any, any, SubscribeWebsocketAction> {
    //
    //     return (dispatch: ThunkDispatch<any, any, SubscribeWebsocketAction>): Promise<SubscribeWebsocketAction> => {
    //         return Promise.resolve().then(() => {
    //             const subscription = observable.subscribe({
    //                 next: messages => messageProcessor(messages),
    //                 error: err => console.log(`error: ${err}`),
    //                 complete: () => {
    //                     console.log('subscription closed')
    //                 }
    //             });
    //
    //             const pauseSubscription = pauseSubject.subscribe();
    //             pauseSubject.next(!paused);
    //
    //             return dispatch({
    //                 type: WEBSOCKET_SUBSCRIBED,
    //                 time: 0,
    //                 timeRange: new TimeRange(0, timeWindow),
    //                 events: Map<string, TimeEvents>(),
    //                 timeSeries: Map<string, TimeSeries>(),
    //                 subscription: subscription,
    //                 pauseSubscription: pauseSubscription
    //             })
    //         })
    //     }
    // }

    /**
     * Unsubscribe to the observable instances that listen to websocket messages and pause the processing
     * @param {Subscription} subscription The observable that listens to messages from the websocket
     * @param {Subscription} pauseSubscription The observable that listens for requests to pause the message processing
     * @return {ThunkAction<Promise<UnsubscribeWebsocketAction>, any, any, UnsubscribeWebsocketAction>}
     */
    function unsubscribe(subscription: Subscription,
                         pauseSubscription: Subscription):
        ThunkAction<Promise<UnsubscribeWebsocketAction>, any, any, UnsubscribeWebsocketAction> {
        return (dispatch: ThunkDispatch<any, any, UnsubscribeWebsocketAction>): Promise<UnsubscribeWebsocketAction> => {
            return Promise.resolve().then(() => {

                subscription.unsubscribe();
                pauseSubscription.unsubscribe();

                return dispatch({
                    type: WEBSOCKET_UNSUBSCRIBED
                })
            });
        }
    }

    /**
     * Sends message to server to start the simulation and then dispatches the message when the simulation is started
     * @param {WebSocketSubject<string>} websocket The websocket subject for sending messages to the server
     * @return {ThunkAction<Promise<StartSimulationAction>, any, any, StartSimulationAction>} The thunk action
     */
    function startSimulation(websocket: WebSocketSubject<string>):
        ThunkAction<Promise<StartSimulationAction>, any, any, StartSimulationAction> {

        return (dispatch: ThunkDispatch<any, any, StartSimulationAction>): Promise<StartSimulationAction> => {
            return Promise.resolve().then(() => {
                websocket.next(START_MESSAGE.command);

                return dispatch({
                    type: SIMULATION_STARTED
                });
            });
        }
    }

    /**
     * Sends message to server to stop the simulation and then dispatches the message when the simulation is stopped
     * @param {WebSocketSubject<string>} websocket The websocket subject for sending messages to the server
     * @return {ThunkAction<Promise<StartSimulationAction>, any, any, StartSimulationAction>} The thunk action
     */
    function stopSimulation(websocket: WebSocketSubject<string>):
        ThunkAction<Promise<StopSimulationAction>, any, any, StopSimulationAction> {

        return (dispatch: ThunkDispatch<any, any, StopSimulationAction>): Promise<StopSimulationAction> => {
            return Promise.resolve().then(() => {
                websocket.next(STOP_MESSAGE.command);

                return dispatch({
                    type: SIMULATION_STOPPED
                });
            });
        }
    }

    /**
     * Action created for pausing/resuming the processing of simulation events locally. This does not pause the simulation
     * on the server.
     * @param {boolean} pause Whether to pause (`true`) or resume (`false`) the processing
     * @param {Subject<boolean>} pauseSubject The observable to which to send the message
     * @return {PauseSimulationAction} The pause action
     */
    function pauseSimulation(pause: boolean, pauseSubject: Subject<boolean>): PauseSimulationAction {
        pauseSubject.next(pause);
        return {
            type: SIMULATION_PAUSED,
            paused: pause
        }
    }

    // the action creators
    return {
        networkDescriptionUpdate,
        loadNetworkDescription,
        buildNetwork,
        deleteNetwork,
        webSocketSubject,
        networkEventsObservable,
        subscribe,
        unsubscribe,
        startSimulation,
        stopSimulation,
        pauseSimulation
    }
}
