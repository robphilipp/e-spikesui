import * as React from 'react';
import {ThunkDispatch} from "redux-thunk";
import {connect} from "react-redux";
import {HashMap, Option} from "prelude-ts";
import {ITheme} from "@uifabric/styling";
import {Stack} from "@fluentui/react";
import {Color} from "three";
import {Observable} from "rxjs";
import {AppState} from "../redux/reducers/root";
import {NetworkEvent} from '../redux/actions/networkEvent';
import {NeuronInfo} from "../visualization/neuralthree/Neurons";
import {ConnectionInfo} from '../visualization/neuralthree/Connections';
import Network from "../visualization/neuralthree/Network";
// import SpikesChart from "./charts/SpikesChart";

// export interface ColorRange {
//     excitatory: {min: Color, max: Color};
//     inhibitory: {min: Color, max: Color};
// }

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

// export interface DispatchProps {
//
// }

type Props = StateProps & OwnProps;// & DispatchProps

function NetworkVisualization(props: Props): JSX.Element {
    const {
        itheme,
        sceneWidth, sceneHeight,
        excitationColor = new Color(0x00ff00),     // green
        inhibitionColor = new Color(0xff0000),     // red
        colorAttenuation = 0.8,  // mostly the excitation or inhibition color
        networkObservable
    } = props;

    const themePalette = itheme.palette;
    const excitationMinColor = new Color(excitationColor).lerp(new Color(themePalette.white), colorAttenuation);
    const excitationMaxColor = new Color(excitationColor);
    const inhibitionMinColor = new Color(inhibitionColor).lerpHSL(new Color(themePalette.white), colorAttenuation);
    const inhibitionMaxColor = new Color(inhibitionColor);
    const colors = {
        excitatory: {min: new Color(excitationMinColor), max: new Color(excitationMaxColor)},
        inhibitory: {min: new Color(inhibitionMinColor), max: new Color(inhibitionMaxColor)}
    };

    // const textStyle = {
    //     marginRight: '4px',
    //     marginLeft: '10px',
    //     color: props.itheme.palette.neutralPrimary
    // };

    return (
        <Stack>
            <Stack.Item>
                <Network
                    sceneHeight={sceneHeight}
                    sceneWidth={sceneWidth}
                    excitationColor={excitationColor}
                    inhibitionColor={inhibitionColor}
                    colorAttenuation={colorAttenuation}
                    colors={colors}
                    networkObservable={networkObservable}
                />
            </Stack.Item>
            {/*<Stack.Item>*/}
            {/*    <SpikesChart*/}
            {/*        heightPerNeuron={20}*/}
            {/*    />*/}
            {/*</Stack.Item>*/}
            {/*<Stack.Item>*/}
            {/*{Array.from(props.neurons.toJsMap(x => x).values())*/}
            {/*.map((neuron, i) => (<Text key={i} block style={textStyle}>{JSON.stringify(neuron)}</Text>))}*/}
            {/*{Array.from(props.connections.toJsMap(x => x).values())*/}
            {/*.map((neuron, i) => (<Text key={i} block style={textStyle}>{JSON.stringify(neuron)}</Text>))}*/}
            {/*</Stack.Item>*/}
        </Stack>
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
 * @param {OwnProps} ownProps The network visualization's own properties
 * @return {StateProps} The updated the state-properties, which in our case is the network neurons and connections
 */
const mapStateToProps = (state: AppState): StateProps => ({
    networkId: state.networkManagement.networkId,
    itheme: state.settings.itheme,
    neurons: state.networkEvent.neurons,
    connections: state.networkEvent.connections,
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param {ThunkDispatch} dispatch The redux dispatcher
 * @param {OwnProps} ownProps The components own properties
 * @return {DispatchProps} The updated dispatch-properties holding the event handlers
 */
// const mapDispatchToProps = (dispatch: ThunkDispatch<unknown, unknown, ApplicationAction>, ownProps: OwnProps): DispatchProps => ({});

export default connect(mapStateToProps, {})(NetworkVisualization)
