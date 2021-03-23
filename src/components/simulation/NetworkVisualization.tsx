import * as React from 'react';
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
import {useNeuronColors} from "../visualization/useNeuronColors";
import {useEffect, useRef, useState} from "react";

interface Dimension {
    width: number;
    height: number;
}

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

    const colors = useNeuronColors(itheme, excitationColor, inhibitionColor, colorAttenuation);

    // const networkRef = useRef<HTMLDivElement>();
    // // const dimensionRef = useRef<Dimension>({width: 100, height: 100});
    // const [dimension, setDimension] = useState<Dimension>({width: 100, height: 100})
    //
    // useEffect(
    //     () => {
    //         setDimension({
    //             width: networkRef.current.offsetWidth,
    //             height: networkRef.current.offsetHeight
    //         });
    //         console.log('useEffect', dimension);
    //
    //         // listen to resize events so that the editor width and height can be updated
    //         window.addEventListener('resize', handleWindowResize);
    //
    //         return () => {
    //             // stop listening to resize events
    //             window.removeEventListener('resize', handleWindowResize);
    //         }
    //     },
    //     []
    // )

    // /**
    //  * calculates the editors dimensions based on the `<div>`'s width and height
    //  * @return The dimension of the editor
    //  */
    // function editorDimensions(): { width: number, height: number } {
    //     const dimensions = {
    //         width: networkRef.current.offsetWidth,
    //         height: networkRef.current.offsetHeight
    //     };
    //     console.log('editorDimensions', dimensions);
    //     return dimensions;
    //     // return {
    //     //     width: editorRef.current.offsetWidth - 25,
    //     //     height: editorRef.current.clientHeight * 0.7
    //     // };
    // }
    //
    // /**
    //  * updates the editor's width and height when the container's dimensions change
    //  */
    // function handleWindowResize(): void {
    //     if (networkRef.current) {
    //         const {width: nextWidth, height: nextHeight} = editorDimensions()
    //         const {width: previousWidth, height: previousHeight} = dimension;
    //         const minDiff = 2;
    //         if (Math.abs(nextHeight - previousHeight) > minDiff ||
    //             Math.abs(nextWidth - previousWidth) > minDiff) {
    //             // setDimension(nextDimension);
    //             setDimension({width: nextWidth, height: nextHeight});
    //             console.log('handleWindowResize', dimension);
    //         }
    //     }
    // }
    //
    // console.log('main', dimension)
    return (
        // <div ref={networkRef}>
            <Network
                visualizationId="live-visualization"
                // sceneWidth={dimension.width}
                // sceneHeight={dimension.height}
                sceneHeight={sceneHeight}
                sceneWidth={sceneWidth}
                excitationColor={excitationColor}
                inhibitionColor={inhibitionColor}
                colorAttenuation={colorAttenuation}
                colors={colors}
                networkObservable={networkObservable}
            />
        // </div>
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
