import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {RouteComponentProps, withRouter} from "react-router-dom";
import {IconButton, ITheme, Separator, Stack, Text, TooltipHost} from "@fluentui/react";
import {
    ApplicationAction,
    clearMessage,
    FeedbackMessage,
    MessageClearedAction,
    MessageSetAction,
    setErrorMessage,
    setLoading
} from "../redux/actions/actions";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {connect} from "react-redux";
import {Option, Vector} from "prelude-ts";
import {WebSocketSubject} from "rxjs/internal-compatibility";
import {Observable, Subject, Subscription} from "rxjs";
import {
    CreateNetworkObservableAction,
    NetworkBuiltAction,
    NetworkDeletedAction,
    // PauseSimulationAction,
    // Sensor,
    // StartSimulationAction,
    // StopSimulationAction,
    // SubscribeWebsocketAction,
    UnsubscribeWebsocketAction,
    WebsocketCreatedAction
} from "../redux/actions/networkManagement";
import {
    deleteNetwork,
    DeleteNetworkAction,
    networkBuildEventsActionCreator,
    NetworkEvent,
    NetworkEventAction,
    NetworkEventsAction
} from "../redux/actions/networkEvent";
import {bufferTime, filter} from "rxjs/operators";
import {remoteActionCreators} from "../../app";
import {Card} from '@uifabric/react-cards';
import NetworkVisualization from "./NetworkVisualization";
import {NetworkManagerThread, newNetworkManagerThread} from "../threads/NetworkManagerThread";
import useSimulationTimer from "./useSimulationTimer";

const headerOffset = 200;

interface Dimension {
    height: number;
    width: number;
}

interface OwnProps extends RouteComponentProps<never> {
    itheme: ITheme;
}

interface StateProps {
    simulationName?: string;
    timeFactor: number;
    simulationDuration: number;

    // holds the path to the network description
    networkDescriptionPath?: string;
    // holds the network description
    networkDescription: string;
    // holds the path to the sensor code snippet
    sensorDescriptionPath?: string;
    // holds the sensor description
    sensorDescription: string;

    // whether or not the network is built
    neuronIds: Vector<string>;
    // holds an error message
    networkBuilt: boolean;
    // neuron ids for the built network
    errorMessages: Option<FeedbackMessage>;
    // the base websocket subscription subject
    webSocketSubject: Option<WebSocketSubject<string>>;
    // the subject for pausing the processing of the incoming messages
    pauseSubject: Subject<boolean>;
    // subscription to the websocket messages through the observable
    subscription: Subscription;
    // subscription to the observable for pausing the message processing
    pauseSubscription: Subscription;
    // whether or not the front-end is paused, while continuing to buffer back-end events
    paused: boolean;
}

interface DispatchProps {
    updateLoadingState: (isLoading: boolean, message?: string) => void;
    // onBuildNetwork: (networkDescription: string) => Promise<NetworkBuiltAction>;
    onDeleteNetwork: (networkId: string) => Promise<NetworkDeletedAction>;
    onClearNetworkState: () => DeleteNetworkAction;

    createWebSocketSubject: (networkId: string) => WebsocketCreatedAction;
    createNetworkObservable: (websocket: WebSocketSubject<string>, bufferInterval: number) => CreateNetworkObservableAction;
    // subscribeWebsocket: (observable: Observable<Array<NetworkEvent>>,
    //                      timeWindow: number,
    //                      eventProcessor: (events: Array<NetworkEvent>) => void,
    //                      pauseSubject: Subject<boolean>,
    //                      paused: boolean) => Promise<SubscribeWebsocketAction>;
    onUnsubscribe: (subscription: Subscription, pauseSubscription: Subscription) => Promise<UnsubscribeWebsocketAction>;

    // onStartSimulation: (websocket: WebSocketSubject<string>, sensor: Sensor) => Promise<StartSimulationAction>;
    // onStopSimulation: (websocket: WebSocketSubject<string>) => Promise<StopSimulationAction>;
    // onSimulationPause: (pause: boolean, pauseSubject: Subject<boolean>) => PauseSimulationAction;

    onSetErrorMessages: (messages: JSX.Element) => MessageSetAction;
    onClearErrorMessages: () => MessageClearedAction;

    // onNetworkEvent: (action: NetworkEventAction) => NetworkEventAction;
    onNetworkBuildEvents: (action: NetworkEventsAction) => NetworkEventsAction;
}

type Props = OwnProps & StateProps & DispatchProps;

function RunDeployManager(props: Props): JSX.Element {
    const {
        updateLoadingState,
        itheme,
        simulationName,
        timeFactor,
        simulationDuration,

        // networkDescriptionPath,
        networkDescription,
        // sensorDescriptionPath,
        sensorDescription,

        // networkId,
        // neuronIds,

        networkBuilt,
        // errorMessages,
        // webSocketSubject,
        // pauseSubject,
        subscription,
        pauseSubscription,
        // running,
        // paused,

        // onBuildNetwork,
        onDeleteNetwork,
        onClearNetworkState,

        // createWebSocketSubject,
        // createNetworkObservable,
        // subscribeWebsocket,
        onUnsubscribe,

        onNetworkBuildEvents,
        // onNetworkEvent,
        // onStartSimulation,
        // onStopSimulation,

        onSetErrorMessages,
        onClearErrorMessages
    } = props;

    // observable that streams the unadulterated network events
    const buildSubscriptionRef = useRef<Subscription>()
    const [networkSubject, setSubjectObservable] = useState<Subject<NetworkEvent>>(new Subject());
    const [running, setRunning] = useState(false);
    const [usedUp, setUsedUp] = useState(false);

    const networkManagerThreadRef = useRef<NetworkManagerThread>();
    const [networkId, setNetworkId] = useState<Option<string>>(Option.none());

    const visualizationRef = useRef<HTMLDivElement>();
    const [dimension, setDimension] = useState<Dimension>({height: window.innerHeight - headerOffset, width: window.innerWidth - 50});

    // simulation time
    const {simulationTime, startTimer, cancelTimer} = useSimulationTimer(handleStop)

    // creates the new sensor simulation thread that runs the javascript code snippet
    useEffect(
        () => {
            // set up the network manager thread for managing the network and the sensor
            newNetworkManagerThread().then(managerThread => networkManagerThreadRef.current = managerThread);

            // listen to resize events so that the visualization size can be updated
            window.addEventListener('resize', handleWindowResize);

            return () => {
                // stop listening to resize events
                window.removeEventListener('resize', handleWindowResize);

                networkManagerThreadRef.current?.stop()
                    .then(() => networkManagerThreadRef.current?.remove()
                        .then(() => networkManagerThreadRef.current?.terminate())
                    );
            }
        },
        []
    )

    // unsubscribe from the build subscription when the network is built, and
    // reset the loading state and the network used-up state
    useEffect(
        () => {
            if (networkBuilt) {
                updateLoadingState(false);
                setUsedUp(false);
                buildSubscriptionRef.current.unsubscribe();
            }
        },
        [networkBuilt]
    )

    /**
     * calculates the editors dimensions based on the `<div>`'s width and height
     * @return The dimension of the editor
     */
    function editorDimensions(): Dimension {
        return {
            width: visualizationRef.current.offsetWidth - 50,
            height: visualizationRef.current.offsetHeight - headerOffset
        };
    }

    /**
     * updates the editor's width and height when the container's dimensions change
     */
    function handleWindowResize(): void {
        if (visualizationRef.current) {
            const nextDimension = editorDimensions()
            const minDiff = 2;
            if (Math.abs(nextDimension.height - dimension.height) > minDiff ||
                Math.abs(nextDimension.width - dimension.width) > minDiff) {
                setDimension(nextDimension);
            }
        }
    }

    /**
     * Attempts to build the network on the server.
     * @return An empty promise
     */
    async function handleBuildNetwork(): Promise<void> {
        // in most cases, the network thread should have been created already. but in
        // case it hasn't, attempt to create the network manager thread, and then call
        // this function once it has been built
        if (networkManagerThreadRef.current === undefined) {
            try {
                networkManagerThreadRef.current = await newNetworkManagerThread()
                await handleBuildNetwork();
            } catch(error) {
                onSetErrorMessages(<div>Cannot build network; {error.toString()}</div>)
                return;
            }
        }
        const networkManager = networkManagerThreadRef.current;

        onClearErrorMessages();
        updateLoadingState(true, `Building network`);

        try {
            // attempt to deploy the server
            updateLoadingState(true, "Deploying network")
            const id = await networkManager.deploy(networkDescription);
            // now that the network has been deployed, we need to tell the server to build it
            // and we need to respond to the network build events emitted by the network on the
            // server
            updateLoadingState(true, `Building network ${id}`)
            networkManager.build(id).then(networkEvents => {
                // emits array's for build (neuron creation and connection) events that occur within a
                // 100 ms windows. drops non building events, and emits nothing when no events occur in the
                // time window
                const buildObservable: Observable<Array<NetworkEvent>> = networkEvents.pipe(
                    bufferTime(100),
                    filter(events => events.length > 0)
                );

                // subscribe to the network build events
                buildSubscriptionRef.current = buildObservable.subscribe(processNetworkBuildEvents);

                // set the network ID
                setNetworkId(Option.of(id));
            })
        } catch (error) {
            onSetErrorMessages(error.toString());
            updateLoadingState(false);
        }
    }

    /**
     * Attempts to delete the network from the server
     * @return An empty promise
     */
    async function handleDeleteNetwork(): Promise<void> {
        const id = networkId.getOrUndefined();
        if (id === undefined) {
            onSetErrorMessages(<div>Cannot delete network because the network ID is undefined</div>)
            return;
        }

        // in most cases, the network thread should have been created already. but in
        // case it hasn't, attempt to create the network manager thread, and then call
        // this function once it has been built
        if (networkManagerThreadRef.current === undefined) {
            onSetErrorMessages(<div>Cannot delete network {id} because tge network manager thread is undefined.</div>)
            return;
        }
        const networkManager = networkManagerThreadRef.current;

        updateLoadingState(true, `Deleting network`);

        try {
            const action = await onDeleteNetwork(id);
            action.result
                .ifLeft(messages => onSetErrorMessages(asErrorMessage(messages)))
                .ifRight(() => {
                    // clear out the network ID and let the network manager
                    // thread know to remove the network
                    setNetworkId(Option.none());
                    networkManager.remove();
                    // clear the network state and unsubscribe from the network events
                    onClearNetworkState();
                    return onUnsubscribe(subscription, pauseSubscription);
                })
        } finally {
            updateLoadingState(false)
        }
    }

    /**
     * Attempts to delete, and then build the network on the server.
     * @return An empty promise
     */
    async function handleRebuildNetwork(): Promise<void> {
        await handleDeleteNetwork();
        await handleBuildNetwork();
        return;
    }

    /**
     * Processes and dispatches network build events
     * @param events An array of incoming network events
     */
    function processNetworkBuildEvents(events: Array<NetworkEvent>): void {
        // convert the network build events into a action holding those events and dispatch
        // if there are any events
        const actions = networkBuildEventsActionCreator(events);
        if (actions.events.length > 0) {
            // as the network build events are dispatched, the reducer updates the neurons and
            // connections. to build connections, the reducer must reconcile the pre- and post-
            // synaptic neurons in the connection event with the existing neurons in the state.
            // In some cases, that may fail, so we wrap the events in a try and report any errors.
            try {
                onNetworkBuildEvents(actions);
            } catch (error) {
                onSetErrorMessages(<div>{error.message}</div>);
                updateLoadingState(false);
            }
        }
    }

    /**
     * Attempts to start the network simulation by sending signals to the network. A start() call is
     * issued to the network manager thread, which returns an observable with the network spiking
     * signals.
     * @return An empty promise.
     */
    async function handleStart(): Promise<void> {
        if (networkManagerThreadRef.current === undefined) {
            onSetErrorMessages(<div>Cannot start the network because the network manager thread is undefined</div>)
            return;
        }
        const networkManager = networkManagerThreadRef.current;

        updateLoadingState(true, "Attempting to start neural network")
        try {
            const observable = await networkManager.start(sensorDescription, timeFactor);
            setSubjectObservable(observable);
            setRunning(true);

            // start the simulation timer
            startTimer(simulationDuration, timeFactor);
        } catch (error) {
            onSetErrorMessages(<div>{error.toString()}</div>)
        } finally {
            updateLoadingState(false);
        }
    }

    /**
     * Attempts to the stop the network simulation.
     * @return An empty promise
     */
    async function handleStop(): Promise<void> {
        if (networkManagerThreadRef.current === undefined) {
            onSetErrorMessages(<div>Cannot stop the network because the network manager thread is undefined</div>)
            return;
        }
        const networkManager = networkManagerThreadRef.current;

        updateLoadingState(true, "Stopping simulation");
        try {
            await networkManager.stop();
            updateLoadingState(false);
            setRunning(false);
            setUsedUp(true);

            // stop the simulation timer
            cancelTimer();
        } catch (error) {
            onSetErrorMessages(<div>{error.toString()}</div>);
        }
    }

    // /**
    //  * Handle the user click on the pause button. Calls `setState(...)` method to toggle the `pause` state.
    //  */
    // function handlePause() {
    //     props.onSimulationPause(!props.paused, props.pauseSubject);
    // }

    function asErrorMessage(errors: Array<string>): JSX.Element {
        return <>{errors.map((error, key) => (<div key={key}>{error}</div>))}</>
    }

    function networkDeleteFailed(error: string): JSX.Element {
        return <>
            <div>Failed to delete network from server.</div>
            <div>{error}</div>
        </>
    }

    function networkInfo(networkId: string): JSX.Element {
        return <Stack horizontal>
            <Stack.Item grow>
                <Stack>
                    <Stack.Item>
                        <Text variant="small" style={{color: itheme.palette.themePrimary, marginBottom: '-10px'}}>
                            Network ID
                        </Text>
                    </Stack.Item>
                    <Stack.Item>
                        <Text
                            variant="medium"
                            key={1}
                            style={{
                                color: itheme.palette.black,
                                fontFamily: 'monospace',
                                fontWeight: 800
                            }}
                        >
                            {networkId}
                        </Text>
                    </Stack.Item>
                </Stack>
            </Stack.Item>
            <Stack.Item grow={2}>
                <Stack>
                    <Stack.Item>
                        <Text variant="small" style={{color: itheme.palette.themePrimary, marginBottom: '-10px'}}>
                            Simulation Name
                        </Text>
                    </Stack.Item>
                    <Stack.Item>
                        <Text
                            variant="medium"
                            key={1}
                            style={{
                                color: itheme.palette.black,
                                fontFamily: 'monospace',
                                fontWeight: 800
                            }}
                        >
                            {simulationName}
                        </Text>
                    </Stack.Item>
                </Stack>
            </Stack.Item>
            <Stack.Item grow={1}>
                <Stack>
                    <Stack.Item>
                        <Text variant="small" style={{color: itheme.palette.themePrimary, marginBottom: '-10px'}}>
                            Duration
                        </Text>
                    </Stack.Item>
                    <Stack.Item>
                        <Text
                            variant="medium"
                            key={1}
                            style={{
                                color: itheme.palette.black,
                                fontFamily: 'monospace',
                                fontWeight: 800
                            }}
                        >
                            {simulationTime !== undefined ? `${Math.floor(simulationTime)} s /` : ''} {simulationDuration} s
                        </Text>
                    </Stack.Item>
                </Stack>
            </Stack.Item>
            <Stack.Item grow={1}>
                <Stack>
                    <Stack.Item>
                        <Text variant="small" style={{color: itheme.palette.themePrimary, marginBottom: '-10px'}}>
                            Time Factor
                        </Text>
                    </Stack.Item>
                    <Stack.Item>
                        <Text
                            variant="medium"
                            key={1}
                            style={{
                                color: itheme.palette.black,
                                fontFamily: 'monospace',
                                fontWeight: 800
                            }}
                        >
                            {timeFactor} (simulation/real)
                        </Text>
                    </Stack.Item>
                </Stack>
            </Stack.Item>
        </Stack>
    }

    /**
     * Returns the button for building/deploying the network to the server when the network has not yet
     * been built. Or, returns the button for deleting the network when the network has already been
     * deployed.
     * @return The network management button
     */
    function networkManagementButton(): JSX.Element {
        if (networkId.isNone()) {
            return <TooltipHost content="Deploy network to server and build.">
                <IconButton
                    iconProps={{iconName: "build"}}
                    style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                    onClick={handleBuildNetwork}
                />
            </TooltipHost>
        }
        return <TooltipHost
            content="Delete network from server.">
            <IconButton
                iconProps={{iconName: "delete"}}
                style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                onClick={handleDeleteNetwork}
            />
        </TooltipHost>

    }

    /**
     * Returns the network simulation button, depending on the network state.
     * <ol>
     *     <li>
     *         When the network has been built, but is not yet running, then returns a button
     *         to start the network.
     *     </li>
     *     <li>
     *         When the network is running, returns a button to stop the network.
     *     </li>
     *     <li>
     *         When the network has been stopped (i.e. after it had been running), then the
     *         network is "used up", and this function returns a button to redeploy the
     *         same network.
     *     </li>
     * @return A button for managing the network simulation
     */
    function networkSimulationButton(): JSX.Element {
        if (usedUp) {
            return <TooltipHost content="Redeploy network (delete and deploy)">
                <IconButton
                    iconProps={{iconName: "reset"}}
                    style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                    onClick={handleRebuildNetwork}
                />
            </TooltipHost>
        }
        if (running) {
            return <TooltipHost content="Stop network.">
                <IconButton
                    iconProps={{iconName: "stop"}}
                    style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                    onClick={handleStop}
                />
            </TooltipHost>
        }
        return <TooltipHost content="Run network on server.">
            <IconButton
                iconProps={{iconName: "play"}}
                style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                onClick={handleStart}
            />
        </TooltipHost>
    }

    return <div
        ref={visualizationRef}
        style={{height: window.innerHeight * 0.9, width: '100%'}}
    >
        <Stack>
            <Stack horizontal>
                <Stack.Item>
                    {networkManagementButton()}
                </Stack.Item>
            </Stack>
            <Stack>
                <Stack.Item>
                    {networkId.map(id => (
                        <Card key={1} tokens={{childrenMargin: 12, boxShadow: "none", maxWidth: 'unset'}}>
                            <Separator
                                vertical={false}
                                color={itheme.palette.neutralSecondary}
                                styles={{root: {padding: 0, fontSize: 14}}}
                            >Simulation Information</Separator>
                            <Card.Section>
                                {networkInfo(id)}
                            </Card.Section>
                            <Separator
                                vertical={false}
                                color={itheme.palette.neutralSecondary}
                                styles={{root: {padding: 0, fontSize: 0}}}
                            />
                            <Card.Section horizontal>
                                {networkSimulationButton()}
                                <TooltipHost content="Pause processing of events.">
                                    <IconButton
                                        disabled={usedUp || !running}
                                        iconProps={{iconName: "pause"}}
                                        style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                                        // onClick={handlePause}
                                    />
                                </TooltipHost>
                            </Card.Section>
                        </Card>
                    )).getOrElse(<span/>)}
                </Stack.Item>
            </Stack>
            <Stack>
                <Stack.Item grow>
                    {networkId.isSome() && networkBuilt ?
                        <NetworkVisualization
                            key="net-1"
                            networkObservable={networkSubject}
                            sceneHeight={dimension.height - 200}
                            sceneWidth={dimension.width}
                            // onClose={hideSimulationLayer}
                            {...props}
                        /> :
                        <div/>
                    }
                </Stack.Item>
            </Stack>
        </Stack>
    </div>;
}


/*
 |
 |    REACT-REDUX functions and code
 |    (see also redux/actions.ts for the action types)
 |
 */
/**
 * react-redux function that maps the application state to the props used by the `App` component.
 * @param state The updated application state
 */
const mapStateToProps = (state: AppState): StateProps => ({
    simulationName: state.simulationProject.name,
    timeFactor: state.simulationProject.timeFactor,
    simulationDuration: state.simulationProject.simulationDuration,

    networkDescriptionPath: state.simulationProject.networkDescriptionPath,
    networkDescription: state.networkDescription.description,
    sensorDescriptionPath: state.sensorDescription.path,
    sensorDescription: state.sensorDescription.codeSnippet,

    neuronIds: state.networkEvent.neurons.toVector().map(([, info]) => info.name),
    networkBuilt: state.networkEvent.networkBuilt,
    errorMessages: state.application.message,

    webSocketSubject: Option.ofNullable(state.networkManagement.websocketSubject),
    pauseSubject: state.networkManagement.pauseSubject,
    subscription: state.networkManagement.subscription,
    pauseSubscription: state.networkManagement.pauseSubscription,
    paused: state.networkManagement.paused
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    updateLoadingState: (isLoading: boolean, message?: string) => dispatch(setLoading(isLoading, message)),

    // onBuildNetwork: (networkDescription: string) =>
    //     dispatch(remoteActionCreators.networkManagement.buildNetwork(networkDescription)),

    onDeleteNetwork: (networkId: string) =>
        dispatch(remoteActionCreators.networkManagement.deleteNetwork(networkId)),

    onClearNetworkState: () => dispatch(deleteNetwork()),

    createWebSocketSubject: (networkId: string) =>
        dispatch(remoteActionCreators.networkManagement.webSocketSubject(networkId)),

    createNetworkObservable: (websocket: WebSocketSubject<string>, bufferInterval: number) =>
        dispatch(remoteActionCreators.networkManagement.networkEventsObservable(websocket, bufferInterval)),

    // subscribeWebsocket: (observable: Observable<Array<NetworkEvent>>,
    //                      timeWindow: number,
    //                      eventProcessor: (events: Array<NetworkEvent>) => void,
    //                      pauseSubject: Subject<boolean>,
    //                      paused: boolean) =>
    //     dispatch(remoteActionCreators.networkManagement.subscribe(
    //         observable, timeWindow, eventProcessor, pauseSubject, paused
    //     )),

    onUnsubscribe: (subscription: Subscription, pauseSubscription: Subscription) =>
        dispatch(remoteActionCreators.networkManagement.unsubscribe(subscription, pauseSubscription)),

    // onStartSimulation: (websocket: WebSocketSubject<string>, sensor: Sensor) =>
    //     dispatch(remoteActionCreators.networkManagement.startSimulation(websocket, sensor)),

    // onStopSimulation: (websocket: WebSocketSubject<string>) =>
    //     dispatch(remoteActionCreators.networkManagement.stopSimulation(websocket)),

    // onSimulationPause: (pause: boolean, pauseSubject: Subject<boolean>) =>
    //     dispatch(remoteActionCreators.networkManagement.pauseSimulation(pause, pauseSubject)),

    onSetErrorMessages: (message: JSX.Element) => dispatch(setErrorMessage(message)),

    onClearErrorMessages: () => dispatch(clearMessage()),

    // onNetworkEvent: (action: NetworkEventAction) => dispatch(action),

    onNetworkBuildEvents: (action: NetworkEventsAction) => dispatch(action)
});

const connectedRunDeployManager = connect(mapStateToProps, mapDispatchToProps)(RunDeployManager);
export default withRouter(connectedRunDeployManager);
