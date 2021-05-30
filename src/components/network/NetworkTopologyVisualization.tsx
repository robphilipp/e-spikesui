import * as React from 'react';
import {useEffect, useState} from 'react';
import {HashMap, HashSet} from "prelude-ts";
import {ITheme} from "@uifabric/styling";
import Network from "../visualization/neuralthree/Network"
import {Color} from "three";
import {interval, Observable} from "rxjs";
import {EventTime, NetworkEvent, SignalIntensity, SPIKE, updateNetworkTopology} from "../redux/actions/networkEvent";
import {NeuronInfo} from "../visualization/neuralthree/Neurons";
import {ConnectionInfo} from "../visualization/neuralthree/Connections";
import {IconButton, Label, Spinner, SpinnerSize, Stack, TooltipHost} from "@fluentui/react";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {connect} from "react-redux";
import {RouteComponentProps, withRouter} from "react-router-dom";
import {networkTopology, NetworkTopology} from "./networkTopology";
import {map} from "rxjs/operators";
import {useNeuronColors} from "../visualization/useNeuronColors";
import {
    Grid,
    gridArea,
    GridCell,
    gridTemplateAreasBuilder,
    gridTrackTemplateBuilder,
    useGridCell,
    withFraction,
    withPixels
} from 'react-resizable-grid-layout';

export interface OwnProps extends RouteComponentProps<never> {
    itheme: ITheme;

    sceneHeight: number;
    sceneWidth: number;
    excitationColor?: Color;
    inhibitionColor?: Color;
    colorAttenuation?: number;

    onClose?: () => void;
}

interface StateProps {
    network: string;
    modified: boolean;
    neurons: HashMap<string, NeuronInfo>;
    connections: HashMap<string, ConnectionInfo>;
}

interface DispatchProps {
    onCompiled: (topology: NetworkTopology) => void;
}

type Props = StateProps & DispatchProps & OwnProps;

/**
 * Visualization of the network topology with simulation neuron firings
 * @param props The properties for displaying the simulated network
 * @constructor
 */
function NetworkTopologyVisualization(props: Props): JSX.Element {
    const {
        itheme,
        // sceneWidth,
        // sceneHeight,
        excitationColor = new Color(itheme.palette.green),     // green
        inhibitionColor = new Color(itheme.palette.red),     // red
        colorAttenuation = 0.8,  // mostly the excitation or inhibition color

        network,    // the network description
        neurons,
        connections,
        onClose,
        onCompiled,
    } = props;

    const [networkObservable, setNetworkObservable] = useState<Observable<NetworkEvent>>()

    const colors = useNeuronColors(itheme, excitationColor, inhibitionColor, colorAttenuation);

    // updates the network topology when the network description changes
    useEffect(
        () => {
            networkTopology(network)
                .ifRight(topology => onCompiled(topology))
                .ifLeft(error => console.error(error));
        },
        [network, onCompiled]
    )

    useEffect(
        () => {
            setNetworkObservable(sparkleObservable(neurons.keySet()))
        },
        [neurons]
    )

    /**
     * Issues a spike for each neuron, in order, on the observable to simulate the network firing
     * @param neuronIds The neuron IDs
     * @return An observable of network events
     */
    function sparkleObservable(neuronIds: HashSet<string>): Observable<NetworkEvent> {
        const ids = neuronIds.toArray()
        return interval(250).pipe(
            map((value, index) => ({
                type: SPIKE,
                payload: {
                    neuronId: ids[index % ids.length],
                    timestamp: {value: value, units: 'µs'} as EventTime,
                    signalIntensity: {value: 1, units: 'µV'} as SignalIntensity,
                    lastFireTime: {value: value - 2000, units: 'µs'} as EventTime
                }
            } as NetworkEvent))
        )
    }

    /**
     * Handles closing the sensor simulation panel and stops the simulation if it is running
     */
    function handleCloseVisualization(): void {
        if (onClose) onClose();
    }

    if (neurons.isEmpty() || connections.isEmpty()) {
        return (
            <Stack horizontal tokens={{childrenGap: 5}}>
                <Label>Medium spinner</Label>
                <Spinner size={SpinnerSize.medium}/>
            </Stack>
        )
    }
    return (
        <Grid
            dimensionsSupplier={useGridCell}
            gridTemplateColumns={gridTrackTemplateBuilder().addTrack(withFraction(1)).build()}
            gridTemplateRows={gridTrackTemplateBuilder()
                .addTrack(withPixels(1))
                .addTrack(withFraction(1))
                .build()
            }
            gridTemplateAreas={gridTemplateAreasBuilder()
                .addArea('networkEditorSimulationHeader', gridArea(1, 1))
                .addArea('networkEditorNetworkViz', gridArea(2, 1))
                .build()
            }
        >
            <GridCell gridAreaName='networkEditorSimulationHeader'>
                <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                <TooltipHost content="Hide the network visualization">
                    <IconButton
                        iconProps={{iconName: 'close'}}
                        onClick={handleCloseVisualization}
                    />
                </TooltipHost>
                </div>
            </GridCell>
            <GridCell gridAreaName='networkEditorNetworkViz'>
                <Network
                    visualizationId="editor-visualization"
                    sceneHeight={
                        // eslint-disable-next-line react-hooks/rules-of-hooks
                        useGridCell().height
                    }
                    sceneWidth={
                        // eslint-disable-next-line react-hooks/rules-of-hooks
                        useGridCell().width
                    }
                    excitationColor={excitationColor}
                    inhibitionColor={inhibitionColor}
                    colorAttenuation={colorAttenuation}
                    colors={colors}
                    networkObservable={networkObservable}
                    spikeDuration={230}
                />
            </GridCell>
        </Grid>
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
});

const connectedNetworkTopology = connect(mapStateToProps, mapDispatchToProps)(NetworkTopologyVisualization);

export default withRouter(connectedNetworkTopology);
