import * as React from 'react';
import {connect} from "react-redux";
import {HashMap, Option} from "prelude-ts";
import {Color} from "three";
import {Observable} from "rxjs";
import {AppState} from "../redux/reducers/root";
import {NetworkEvent} from '../redux/actions/networkEvent';
import {NeuronInfo} from "../visualization/neuralthree/Neurons";
import {ConnectionInfo} from '../visualization/neuralthree/Connections';
import Network from "../visualization/neuralthree/Network";
import {useNeuronColors} from "../visualization/useNeuronColors";
import {useTheme} from "../common/useTheme";
import {useDimensions} from "./useDimensions";

interface OwnProps {
    // sceneHeight: number;
    // sceneWidth: number;
    // height: number
    // width: number
    excitationColor?: Color
    inhibitionColor?: Color
    colorAttenuation?: number
    networkObservable: Observable<NetworkEvent>
}

interface StateProps {
    networkId: Option<string>
    neurons: HashMap<string, NeuronInfo>
    connections: HashMap<string, ConnectionInfo>
}

type Props = StateProps & OwnProps

// todo get the scene width and height from the parent (stack?) and use that for the network vis

/**
 * Network visualization for network events coming from server
 * @param props The properties defining the visualization and the observable holding the
 * network events
 * @return The network visualization
 * @constructor
 */
function NetworkVisualization(props: Props): JSX.Element {
    const {itheme} = useTheme()

    const {
        // size,
        // sceneWidth, sceneHeight,
        // height, width,
        excitationColor = new Color(itheme.palette.green),     // green
        inhibitionColor = new Color(itheme.palette.red),     // red
        colorAttenuation = 0.8,  // mostly the excitation or inhibition color
        networkObservable
    } = props

    // const {width, height} = size

    const colors = useNeuronColors(itheme, excitationColor, inhibitionColor, colorAttenuation)
    const {width, height} = useDimensions()

    return (
        <Network
            visualizationId="live-visualization"
            sceneHeight={height}
            sceneWidth={width}
            // sceneHeight={sceneHeight}
            // sceneWidth={sceneWidth}
            excitationColor={excitationColor}
            inhibitionColor={inhibitionColor}
            colorAttenuation={colorAttenuation}
            colors={colors}
            networkObservable={networkObservable}
        />
    )
}

/*
 |
 |    REACT-REDUX functions and code
 |    (see also redux/actions/networkEvents.ts for the action types)
 |
 */

/**
 * react-redux function that maps the network-events slice of the application state to the components state-props.
 * @param {AppState} state The application state from the redux root store
 * @return {StateProps} The updated the state-properties, which in our case is the network neurons and connections
 */
const mapStateToProps = (state: AppState): StateProps => ({
    networkId: state.networkManagement.networkId,
    neurons: state.networkEvent.neurons,
    connections: state.networkEvent.connections,
});

export default connect(mapStateToProps, {})(NetworkVisualization)
