import * as React from 'react';
import {RouteComponentProps, useHistory, withRouter} from "react-router-dom";
import {IconButton, ITheme, PrimaryButton, Stack, StackItem, TooltipHost} from "@fluentui/react";
import {SimulationProject} from "../repos/simulationProjectRepo";
import {ApplicationAction} from "../redux/actions/actions";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {updateSimulationProject} from "../redux/actions/simulationProject";
import {connect} from "react-redux";
import {useState} from "react";
import {Option} from "prelude-ts";

interface OwnProps extends RouteComponentProps<never> {
    itheme: ITheme;
    // networkRouterPath: string;
    // sensorRouterPath: string;
}

interface StateProps {
    simulationName?: string;
    timeFactor: number;
    simulationDuration: number;
    // holds the network ID (once it has been built on the server)
    networkId: Option<string>;

    // networkDescriptionPath?: string;
    // sensorDescriptionPath?: string;
    // modified: boolean;
}

interface DispatchProps {
    onChange: (project: SimulationProject) => void;
    //
    // onLoadSensor: (path: string) => Promise<SensorsLoadedAction>;
    // onLoadNetwork: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    // onSetError: (messages: JSX.Element) => MessageSetAction;
    // onSetSuccess: (messages: JSX.Element) => MessageSetAction;
}

type Props = OwnProps & StateProps & DispatchProps;

function RunDeployManager(props: Props): JSX.Element {
    const {
        itheme,
        // networkRouterPath,
        // sensorRouterPath,
        simulationName,
        timeFactor,
        simulationDuration,

        networkId,
        // networkDescriptionPath,
        // sensorDescriptionPath,
        // onChange,
        // onLoadSensor,
        // onLoadNetwork,
        // onSetError,
    } = props;

    const [loading, setLoading] = useState<boolean>(false);

    const history = useHistory();

    /**
     * Handles the network build/delete button clicks. When the network is built, then deletes
     * the network. When no network is built, then builds the network.
     * @private
     */
    function handleBuildDeleteNetwork(): void {
        // const {
        //     networkId, networkDescription,
        //     subscription, pauseSubscription,
        // } = props;
        //
        // networkId
        //     // if the network ID exists, then the button click is to delete the network, and
        //     // so we send a message down the websocket to delete the network, and then we
        //     // unsubscribe to the observable instance that listen for websocket messages and for
        //     // pausing the message processing
        //     .ifSome(id => props
        //         .onDeleteNetwork(id)
        //         .then(action => action.result.ifLeft(messages => props.onSetErrorMessages(messages)))
        //         .then(result => result.ifRight(_ => {
        //             props.onClearNetworkState();
        //             return props.onUnsubscribe(subscription, pauseSubscription);
        //         }))
        //     )
        //     // if the network ID doesn't exist, then the button click is for creating the network, and
        //     // so we call action creator for creating the network, and if that results in a failure, the
        //     // we call the action creator for setting the error messages.
        //     .ifNone(() => props
        //         .onBuildNetwork(networkDescription)
        //         .then(action => action.result
        //             .ifLeft(messages => props.onSetErrorMessages(messages))
        //             .ifRight(networkId => {
        //                 // create the rxjs web-socket subject and then hand it to the pipeline for
        //                 // processing spikes network events
        //                 const websocketCreatedAction = props.createWebSocketSubject(networkId);
        //                 const observableAction = props.createNetworkObservable(websocketCreatedAction.webSocketSubject, 50);
        //
        //                 // emits array's for build (neuron creation and connection) events that occur within a
        //                 // 100 ms windows. drops non building events, and emits nothing when no events occur in the
        //                 // time window
        //                 const buildObservable: Observable<Array<NetworkEvent>> = observableAction.observable.pipe(
        //                     filter(message => message.type === NEURON || message.type === CONNECTION || message.type === NETWORK),
        //                     bufferTime(100),
        //                     filter(events => events.length > 0)
        //                 );
        //
        //                 // we need to subscribe to the web-socket (through the observable) so that it sends a
        //                 // message to the web-socket to build the network. we also need to process all the build
        //                 // messages so that we can construct the network visualization. to do this we create the
        //                 // build observable that filters out all non-build messages, and then subscribe to it,
        //                 // sending all the network build messages as network events
        //                 props
        //                     .subscribeWebsocket(
        //                         buildObservable,
        //                         5000,
        //                         events => {
        //                             console.log(events)
        //                             const actions = networkBuildEventsActionCreator(events);
        //                             if (actions.events.length > 0) {
        //                                 props.onNetworkBuildEvents(actions);
        //                             }
        //                         },
        //                         observableAction.pauseSubject,
        //                         false
        //                     )
        //                     .then(_ => {
        //                         // send the command to build the network
        //                         websocketCreatedAction.webSocketSubject.next(BUILD_MESSAGE.command);
        //
        //                         // set the build observable
        //                         setNetworkObservable(observableAction.observable);
        //                     })
        //                     .catch(messages => props.onSetErrorMessages(messages))
        //             })
        //         )
        //     );
    }


    return <>
        <Stack>
            <Stack horizontal>
                <StackItem>
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
                </StackItem>
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
    onChange: (project: SimulationProject) => dispatch(updateSimulationProject(project)),
    // onLoadSensor: (path: string) => dispatch(loadSensorsFrom(path)),
    // onLoadNetwork: (path: string) => dispatch(loadNetworkDescriptionFrom(path)),
    //
    // onSetError: (messages: JSX.Element) => dispatch(setErrorMessage(messages)),
    // onSetSuccess: (messages: JSX.Element) => dispatch(setSuccessMessage(messages)),
});

const connectedRunDeployManager = connect(mapStateToProps, mapDispatchToProps)(RunDeployManager);
export default withRouter(connectedRunDeployManager);
