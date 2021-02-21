import * as React from 'react';
import {useMemo} from 'react';
import {connect} from "react-redux";
import {HashMap, Option} from "prelude-ts";
import {ITheme} from "@uifabric/styling";
import {Color} from "three";
import {Observable} from "rxjs";
import {AppState} from "../redux/reducers/root";
import {NetworkEvent} from '../redux/actions/networkEvent';
import {NeuronInfo} from "../visualization/neuralthree/Neurons";
import {ConnectionInfo} from '../visualization/neuralthree/Connections';
import Network from "../visualization/neuralthree/Network";

export interface OwnProps {
    sceneHeight: number;
    sceneWidth: number;
    excitationColor?: Color;
    inhibitionColor?: Color;
    colorAttenuation?: number;
    networkObservable: Observable<NetworkEvent>;
}

export interface StateProps {
    itheme: ITheme;

    networkId: Option<string>;
    neurons: HashMap<string, NeuronInfo>;
    connections: HashMap<string, ConnectionInfo>;
}

type Props = StateProps & OwnProps;

// todo get the scene width and height from the parent (stack?) and use that for the network vis

/**
 * Network visualization for network events coming from server
 * @param props The properties defining the visualization and the observable holding the
 * network events
 * @return The network visualization
 * @constructor
 */
function NetworkVisualization(props: Props): JSX.Element {
    const {
        itheme,
        sceneWidth, sceneHeight,
        excitationColor = new Color(itheme.palette.green),     // green
        inhibitionColor = new Color(itheme.palette.red),     // red
        colorAttenuation = 0.8,  // mostly the excitation or inhibition color
        networkObservable
    } = props;

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

    return (
        <div>
            <Network
                sceneHeight={sceneHeight}
                sceneWidth={sceneWidth}
                excitationColor={excitationColor}
                inhibitionColor={inhibitionColor}
                colorAttenuation={colorAttenuation}
                colors={colors}
                networkObservable={networkObservable}
            />
        </div>
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
    itheme: state.settings.itheme,
    neurons: state.networkEvent.neurons,
    connections: state.networkEvent.connections,
});

export default connect(mapStateToProps, {})(NetworkVisualization)
