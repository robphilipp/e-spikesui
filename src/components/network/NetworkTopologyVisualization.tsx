import * as React from 'react';
import {useEffect, useMemo, useRef} from 'react';
import {HashMap} from "prelude-ts";
import {ITheme} from "@uifabric/styling";
import Network from "../visualization/neuralthree/Network"
import {Color} from "three";
import {Observable} from "rxjs";
import {NetworkEvent, updateNetworkTopology} from "../redux/actions/networkEvent";
import {NeuronInfo} from "../visualization/neuralthree/Neurons";
import {ConnectionInfo} from "../visualization/neuralthree/Connections";
import {IconButton, Stack, TooltipHost} from "@fluentui/react";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {connect} from "react-redux";
import {RouteComponentProps, withRouter} from "react-router-dom";
import {networkTopology, NetworkTopology} from "./networkTopology";

export interface OwnProps extends RouteComponentProps<never> {
    itheme: ITheme;

    // networkId: Option<string>;
    // neurons: HashMap<string, NeuronInfo>;
    // connections: HashMap<string, ConnectionInfo>;

    // networkDescription: string;

    sceneHeight: number;
    sceneWidth: number;
    excitationColor?: Color;
    inhibitionColor?: Color;
    colorAttenuation?: number;
    // networkObservable: Observable<NetworkEvent>;

    onClose?: () => void;
}

interface StateProps {
    network: string;
    modified: boolean;
    // networkDescriptionPath?: string;
    // templatePath?: string;
    neurons: HashMap<string, NeuronInfo>;
    connections: HashMap<string, ConnectionInfo>;
}

interface DispatchProps {
    onCompiled: (topology: NetworkTopology) => void;
    // onLoadTemplate: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    // onLoadNetworkDescription: (path: string) => Promise<NetworkDescriptionLoadedAction>;
    // onSave: (path: string, description: string) => Promise<NetworkDescriptionSavedAction>;
}

type Props = StateProps & DispatchProps & OwnProps;

function NetworkTopologyVisualization(props: Props): JSX.Element {
    const {
        itheme,
        sceneWidth,
        sceneHeight,
        excitationColor = new Color(0x00ff00),     // green
        inhibitionColor = new Color(0xff0000),     // red
        colorAttenuation = 0.8,  // mostly the excitation or inhibition color
        // networkObservable,

        network,
        neurons,
        connections,
        onClose,
        onCompiled,
    } = props;

    const networkObservableRef = useRef<Observable<NetworkEvent>>(new Observable(() => {/**/}))

    const excitationMinColor = useMemo<Color>(
        () => new Color(excitationColor).lerp(new Color(itheme.palette.white), colorAttenuation),
        [itheme, excitationColor, colorAttenuation]
    );
    const excitationMaxColor = useMemo<Color>(
        () => new Color(excitationColor),
        [excitationColor]
    );
    const inhibitionMinColor = useMemo<Color>(
        () => new Color(inhibitionColor).lerpHSL(new Color(itheme.palette.white), colorAttenuation),
        [itheme, inhibitionColor, colorAttenuation]
    );
    const inhibitionMaxColor = useMemo<Color>(
        () => new Color(inhibitionColor),
        [inhibitionColor]
    );
    const colors = useMemo(
        () => ({
            excitatory: {min: new Color(excitationMinColor), max: new Color(excitationMaxColor)},
            inhibitory: {min: new Color(inhibitionMinColor), max: new Color(inhibitionMaxColor)}
        }),
        [excitationMinColor, excitationMaxColor, inhibitionMinColor, inhibitionMaxColor]
    )

    useEffect(
        () => {
            if (!neurons.isEmpty() && !connections.isEmpty()) {
                handleCompile();
            }
        },
        [network]
    )

    function handleCompile(): void {
        networkTopology(network)
            .ifRight(topology => onCompiled(topology))
            .ifLeft(error => console.error(error));
    }

    /**
     * Handles closing the sensor simulation panel and stops the simulation if it is running
     */
    function handleCloseSimulation(): void {
        // handleStopSensorSimulation();
        if (onClose) onClose();
    }

    /**
     * Creates a compile button used to compile the sensor description
     * @return The button for compiling the sensor description
     */
    function compileButton(): JSX.Element {
        return <>
            <TooltipHost content="Compile the sensor code">
                <IconButton
                    iconProps={{iconName: 'code'}}
                    // disabled={
                    //     (networkDescription !== undefined && networkDescription.length < 31) ||
                    //     networkObservable !== undefined ||
                    //     expressionState === ExpressionState.RUNNING ||
                    //     expressionState === ExpressionState.COMPILED
                    // }
                    onClick={handleCompile}
                />
            </TooltipHost>
        </>
    }

    /**
     * Creates the button to hide the sensor simulation layer.
     * @return The button for hiding the sensor simulation layer.
     */
    function hideSimulationButton(): JSX.Element {
        return <div>
            <TooltipHost content="Hide the sensor simulation">
                <IconButton
                    iconProps={{iconName: 'close'}}
                    onClick={handleCloseSimulation}
                />
            </TooltipHost>
        </div>
    }

    return (
        <div style={{padding: 10}}>
            <Stack tokens={{childrenGap: 10}}>
                <Stack horizontal tokens={{childrenGap: 0}}>
                    <Stack.Item grow>
                        {compileButton()}
                    </Stack.Item>
                    <Stack.Item tokens={{margin: '-20px 20px 0 0'}}>
                        {hideSimulationButton()}
                    </Stack.Item>
                </Stack>
                {neurons.isEmpty() || connections.isEmpty() ?
                    <div/> :
                    <Stack horizontal tokens={{childrenGap: 5}}>
                    <Stack.Item grow>
                        <Network
                            sceneHeight={sceneHeight}
                            sceneWidth={sceneWidth}
                            excitationColor={excitationColor}
                            inhibitionColor={inhibitionColor}
                            colorAttenuation={colorAttenuation}
                            colors={colors}
                            networkObservable={networkObservableRef.current}
                        />
                    </Stack.Item>
                </Stack>}
            </Stack>
        </div>
    )
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
    network: state.networkDescription.description,
    modified: state.networkDescription.modified,
    neurons: state.networkEvent.neurons,
    connections: state.networkEvent.connections,
    // networkDescriptionPath: state.networkDescription.path,
    // templatePath: state.settings.networkDescription.templatePath
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    onCompiled: (topology: NetworkTopology) => dispatch(updateNetworkTopology(topology)),
    // onLoadTemplate: (path: string) => dispatch(loadNetworkDescriptionFromTemplate(path)),
    // onLoadNetworkDescription: (path: string) => dispatch(loadNetworkDescriptionFrom(path)),
    // onSave: (path: string, description: string) => dispatch(persistNetworkDescription(path, description)),
});

const connectedNetworkTopology = connect(mapStateToProps, mapDispatchToProps)(NetworkTopologyVisualization);

export default withRouter(connectedNetworkTopology);
