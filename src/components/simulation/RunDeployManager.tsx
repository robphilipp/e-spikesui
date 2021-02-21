import * as React from 'react';
import {useState} from 'react';
import {RouteComponentProps, useHistory, withRouter} from "react-router-dom";
import {
    IconButton,
    ITheme,
    Stack,
    StackItem,
    TooltipHost,
    Text,
    Tooltip,
    IStackItemStyles,
    Separator
} from "@fluentui/react";
import {
    ApplicationAction,
    clearMessage,
    FeedbackMessage,
    MessageClearedAction,
    MessageSetAction,
    setErrorMessage, setLoading
} from "../redux/actions/actions";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {connect} from "react-redux";
import {Option, Vector} from "prelude-ts";
import {WebSocketSubject} from "rxjs/internal-compatibility";
import {Observable, Subject, Subscription} from "rxjs";
import {
    BUILD_MESSAGE,
    CreateNetworkObservableAction,
    NetworkBuiltAction,
    NetworkDeletedAction,
    PauseSimulationAction,
    StartSimulationAction,
    StopSimulationAction,
    SubscribeWebsocketAction,
    UnsubscribeWebsocketAction,
    WebsocketCreatedAction
} from "../redux/actions/networkManagement";
import {
    CONNECTION,
    deleteNetwork,
    DeleteNetworkAction,
    NETWORK,
    networkBuildEventsActionCreator,
    NetworkEvent,
    NetworkEventAction,
    NetworkEventsAction,
    NEURON
} from "../redux/actions/networkEvent";
import {bufferTime, filter} from "rxjs/operators";
import {remoteActionCreators} from "../../app";
import { Card } from '@uifabric/react-cards';

interface OwnProps extends RouteComponentProps<never> {
    itheme: ITheme;
    // networkRouterPath: string;
    // sensorRouterPath: string;
}

interface StateProps {
    simulationName?: string;
    timeFactor: number;
    simulationDuration: number;

    // holds the path to the network description
    networkDescriptionPath?: string;
    // holds the network description
    networkDescription: string;
    // holds the network ID (once it has been built on the server)
    networkId: Option<string>;
    // whether or not the network is built
    neuronIds: Vector<string>;
    // holds an error message
    networkBuilt: boolean;
    // neuron ids for the built network
    errorMessages: Option<FeedbackMessage>;
    // // the current application theme
    // itheme: ITheme;
    // the base websocket subscription subject
    webSocketSubject: Option<WebSocketSubject<string>>;
    // the subject for pausing the processing of the incoming messages
    pauseSubject: Subject<boolean>;
    // subscription to the websocket messages through the observable
    subscription: Subscription;
    // subscription to the observable for pausing the message processing
    pauseSubscription: Subscription;
    // whether or not the simulation is running
    running: boolean;
    // whether or not the front-end is paused, while continuing to buffer back-end events
    paused: boolean;

    // networkDescriptionPath?: string;
    // sensorDescriptionPath?: string;
    // modified: boolean;
}

interface DispatchProps {
    onLoading: (isLoading: boolean, message?: string) => void;
    // onChange: (project: SimulationProject) => void;
    //
    // onLoadSensor: (path: string) => Promise<SensorsLoadedAction>;
    // onLoadNetwork: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    // onSetError: (messages: JSX.Element) => MessageSetAction;
    // onSetSuccess: (messages: JSX.Element) => MessageSetAction;
    // loadNetworkDescription: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    onBuildNetwork: (networkDescription: string) => Promise<NetworkBuiltAction>;
    onDeleteNetwork: (networkId: string) => Promise<NetworkDeletedAction>;
    onClearNetworkState: () => DeleteNetworkAction;

    createWebSocketSubject: (networkId: string) => WebsocketCreatedAction;
    createNetworkObservable: (websocket: WebSocketSubject<string>, bufferInterval: number) => CreateNetworkObservableAction;
    subscribeWebsocket: (observable: Observable<Array<NetworkEvent>>,
                         timeWindow: number,
                         eventProcessor: (events: Array<NetworkEvent>) => void,
                         pauseSubject: Subject<boolean>,
                         paused: boolean) => Promise<SubscribeWebsocketAction>;
    onUnsubscribe: (subscription: Subscription, pauseSubscription: Subscription) => Promise<UnsubscribeWebsocketAction>;

    onStartSimulation: (websocket: WebSocketSubject<string>) => Promise<StartSimulationAction>;
    onStopSimulation: (websocket: WebSocketSubject<string>) => Promise<StopSimulationAction>;
    onSimulationPause: (pause: boolean, pauseSubject: Subject<boolean>) => PauseSimulationAction;

    onSetErrorMessages: (messages: JSX.Element) => MessageSetAction;
    onClearErrorMessages: () => MessageClearedAction;

    onNetworkEvent: (action: NetworkEventAction) => NetworkEventAction;
    onNetworkBuildEvents: (action: NetworkEventsAction) => NetworkEventsAction;
}

type Props = OwnProps & StateProps & DispatchProps;

function RunDeployManager(props: Props): JSX.Element {
    const {
        onLoading,
        itheme,
        simulationName,
        timeFactor,
        simulationDuration,

        networkId,
        networkDescriptionPath,
        networkDescription,
        neuronIds,
        networkBuilt,
        errorMessages,
        webSocketSubject,
        pauseSubject,
        subscription,
        pauseSubscription,
        running,
        paused,

        onBuildNetwork,
        onDeleteNetwork,
        onClearNetworkState,

        createWebSocketSubject,
        createNetworkObservable,
        subscribeWebsocket,
        onUnsubscribe,

        onNetworkBuildEvents,
        onNetworkEvent,

        onSetErrorMessages,
        onClearErrorMessages
    } = props;

    const [loading, setLoading] = useState<boolean>(false);

    const history = useHistory();

    // observable that streams the unadulterated network events
    const [networkObservable, setNetworkObservable] = useState<Observable<NetworkEvent>>(new Observable());

    // useEffect(
    //     () => {
    //         if (networkDescriptionPath && networkDescription === undefined) {
    //             loadNetworkDescriptionFrom(networkDescriptionPath);
    //         }
    //     },
    //     [networkDescriptionPath]
    // )

    /**
     * Handles the network build/delete button clicks. When the network is built, then deletes
     * the network. When no network is built, then builds the network.
     * @private
     */
    function handleBuildDeleteNetwork(): void {
        onLoading(true, networkId.map(id => `Deleting network ${id}`).getOrElse(`Building network`));
        networkId
            // if the network ID exists, then the button click is to delete the network, and
            // so we send a message down the websocket to delete the network, and then we
            // unsubscribe to the observable instance that listen for websocket messages and for
            // pausing the message processing
            .ifSome(id => onDeleteNetwork(id)
                .then(action => action.result.ifLeft(messages => onSetErrorMessages(asErrorMessage(messages))))
                .then(result => result.ifRight(() => {
                    onClearNetworkState();
                    return onUnsubscribe(subscription, pauseSubscription);
                }))
                .finally(() => onLoading(false))
            )
            // if the network ID doesn't exist, then the button click is for creating the network, and
            // so we call action creator for creating the network, and if that results in a failure, the
            // we call the action creator for setting the error messages.
            .ifNone(() => onBuildNetwork(networkDescription)
                .then(action => action.result
                    .ifLeft(messages => onSetErrorMessages(asErrorMessage(messages)))
                    .ifRight(networkId => {
                        // create the rxjs web-socket subject and then hand it to the pipeline for
                        // processing spikes network events
                        const websocketCreatedAction = createWebSocketSubject(networkId);
                        const observableAction = createNetworkObservable(websocketCreatedAction.webSocketSubject, 50);

                        // emits array's for build (neuron creation and connection) events that occur within a
                        // 100 ms windows. drops non building events, and emits nothing when no events occur in the
                        // time window
                        const buildObservable: Observable<Array<NetworkEvent>> = observableAction.observable.pipe(
                            filter(message => message.type === NEURON || message.type === CONNECTION || message.type === NETWORK),
                            bufferTime(100),
                            filter(events => events.length > 0)
                        );

                        // we need to subscribe to the web-socket (through the observable) so that it sends a
                        // message to the web-socket to build the network. we also need to process all the build
                        // messages so that we can construct the network visualization. to do this we create the
                        // build observable that filters out all non-build messages, and then subscribe to it,
                        // sending all the network build messages as network events
                        subscribeWebsocket(
                            buildObservable,
                            5000,
                            events => {
                                console.log(events)
                                const actions = networkBuildEventsActionCreator(events);
                                if (actions.events.length > 0) {
                                    onNetworkBuildEvents(actions);
                                }
                            },
                            observableAction.pauseSubject,
                            false
                        )
                            .then(() => {
                                // send the command to build the network
                                websocketCreatedAction.webSocketSubject.next(BUILD_MESSAGE.command);

                                // set the build observable
                                setNetworkObservable(observableAction.observable);
                            })
                            .catch(messages => onSetErrorMessages(messages))
                    })
                )
                .finally(() => onLoading(false))
            );
    }

    // function loadNetworkDescriptionIfNeeded(): boolean {
    //     if (networkDescriptionPath && networkDescription === undefined) {
    //         loadNetworkDescriptionFrom(networkDescriptionPath);
    //         return true;
    //     }
    //     return false;
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
                            {simulationDuration} s
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

    return <>
        <Stack>
            <Stack horizontal>
                <Stack.Item>
                    <TooltipHost
                        content={networkId.isNone() ?
                            "Deploy network to server and build." :
                            "Delete network from server."
                        }
                    >
                        <IconButton
                            disabled={loading}
                            iconProps={networkId.isNone() ?
                                {iconName: "build"} :
                                {iconName: "delete"}
                            }
                            style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                            onClick={handleBuildDeleteNetwork}
                        />
                    </TooltipHost>
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
                            <Card.Section>
                                <TooltipHost content="Run network on server.">
                                    <IconButton
                                        iconProps={{iconName: "play"}}
                                        style={{color: itheme.palette.themePrimary, fontWeight: 400}}
                                        // onClick={handleEditSensorDescription}
                                    />
                                </TooltipHost>
                            </Card.Section>
                        </Card>
                )).getOrElse(<span/>)}
                </Stack.Item>
            </Stack>
        </Stack>
    </>
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
    networkId: state.networkManagement.networkId,

    networkDescriptionPath: state.simulationProject.networkDescriptionPath,
    networkDescription: state.networkDescription.description,
    neuronIds: state.networkEvent.neurons.toVector().map(([, info]) => info.name),
    networkBuilt: state.networkEvent.networkBuilt,
    errorMessages: state.application.message,

    webSocketSubject: Option.ofNullable(state.networkManagement.websocketSubject),
    pauseSubject: state.networkManagement.pauseSubject,
    subscription: state.networkManagement.subscription,
    pauseSubscription: state.networkManagement.pauseSubscription,
    running: state.networkManagement.running,
    paused: state.networkManagement.paused

    // networkDescriptionPath: state.simulationProject.networkDescriptionPath,
    // sensorDescriptionPath: state.simulationProject.sensorDescriptionPath,
    // modified: state.simulationProject.modified,
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    onLoading: (isLoading: boolean, message?: string) => dispatch(setLoading(isLoading, message)),

    onBuildNetwork: (networkDescription: string) => dispatch(remoteActionCreators.networkManagement.buildNetwork(networkDescription)),
    onDeleteNetwork: (networkId: string) => dispatch(remoteActionCreators.networkManagement.deleteNetwork(networkId)),
    onClearNetworkState: () => dispatch(deleteNetwork()),

    createWebSocketSubject: (networkId: string) => dispatch(remoteActionCreators.networkManagement.webSocketSubject(networkId)),
    createNetworkObservable: (websocket: WebSocketSubject<string>, bufferInterval: number) => dispatch(remoteActionCreators.networkManagement.networkEventsObservable(websocket, bufferInterval)),
    subscribeWebsocket: (observable: Observable<Array<NetworkEvent>>,
                         timeWindow: number,
                         eventProcessor: (events: Array<NetworkEvent>) => void,
                         pauseSubject: Subject<boolean>,
                         paused: boolean) => dispatch(remoteActionCreators.networkManagement.subscribe(observable, timeWindow, eventProcessor, pauseSubject, paused)),
    onUnsubscribe: (subscription: Subscription, pauseSubscription: Subscription) => dispatch(remoteActionCreators.networkManagement.unsubscribe(subscription, pauseSubscription)),

    onStartSimulation: (websocket: WebSocketSubject<string>) => dispatch(remoteActionCreators.networkManagement.startSimulation(websocket)),
    onStopSimulation: (websocket: WebSocketSubject<string>) => dispatch(remoteActionCreators.networkManagement.stopSimulation(websocket)),
    onSimulationPause: (pause: boolean, pauseSubject: Subject<boolean>) => dispatch(remoteActionCreators.networkManagement.pauseSimulation(pause, pauseSubject)),

    onSetErrorMessages: (message: JSX.Element) => dispatch(setErrorMessage(message)),
    onClearErrorMessages: () => dispatch(clearMessage()),

    onNetworkEvent: (action: NetworkEventAction) => dispatch(action),
    onNetworkBuildEvents: (action: NetworkEventsAction) => dispatch(action)
    // onChange: (project: SimulationProject) => dispatch(updateSimulationProject(project)),
    // onLoadSensor: (path: string) => dispatch(loadSensorsFrom(path)),
    // onLoadNetwork: (path: string) => dispatch(loadNetworkDescriptionFrom(path)),
    //
    // onSetError: (messages: JSX.Element) => dispatch(setErrorMessage(messages)),
    // onSetSuccess: (messages: JSX.Element) => dispatch(setSuccessMessage(messages)),
});

const connectedRunDeployManager = connect(mapStateToProps, mapDispatchToProps)(RunDeployManager);
export default withRouter(connectedRunDeployManager);
