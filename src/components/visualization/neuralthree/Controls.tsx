import * as React from 'react'
import {IconButton, IStackTokens, Stack, Toggle} from "@fluentui/react";
import {AppState} from "../../redux/reducers/root";
import {initialNetVisState} from "../../redux/reducers/networkVisualization";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../../redux/actions/actions";
import {
    axesVisibilityChanged,
    cameraUpdated,
    gridVisibilityChanged,
    NetworkVisualizationAxesChangeAction,
    NetworkVisualizationCameraUpdateAction,
    NetworkVisualizationGridChangeAction
} from "../../redux/actions/networkVisualization";
import {PerspectiveCamera, Vector3} from "three";
import {connect} from "react-redux";
import {useThreeContext} from "../basethree/useThree";
import {Option} from "prelude-ts";
import {Coordinate, coordinateFrom} from "../basethree/Coordinate";
import {BoundingSphere} from "../basethree/BoundingSphere";
import {useEffect} from "react";

interface OwnProps {
    visualizationId: string
    gridSceneId: string
    axisSceneId: string
    boundingSphere: BoundingSphere
}

export interface StateProps {
    axesVisible: boolean
    gridVisible: boolean
    camera: Option<PerspectiveCamera>
}

export interface DispatchProps {
    onAxisVisibilityChange: (id: string, visible: boolean) => NetworkVisualizationAxesChangeAction;
    onGridVisibilityChange: (id: string, visible: boolean) => NetworkVisualizationGridChangeAction;
    onCameraUpdate: (id: string, camera: PerspectiveCamera) => NetworkVisualizationCameraUpdateAction;
}

type Props = StateProps & DispatchProps & OwnProps

function Controls(props: Props): JSX.Element {
    const {
        visualizationId,

        axisSceneId,
        axesVisible,
        onAxisVisibilityChange,

        gridSceneId,
        gridVisible,
        onGridVisibilityChange,

        camera,
        onCameraUpdate,
        boundingSphere,
    } = props;

    const {context: {visibility}} = useThreeContext()

    /**
     * Sets the visibility of the three-js axes-scene, and then dispatches a message that the axes'
     * visibility has changed.
     * @param {boolean} visible Set to `true` for the axes to be visible; `false` for the
     * axes to be invisible.
     */
    function setAxesVisibility(visible: boolean): void {
        visibility(axisSceneId, visible);
        onAxisVisibilityChange(visualizationId, visible)
    }

    /**
     * Sets the visibility of the three-js grid-scene, and then dispatches a message that the grid's
     * visibility has changed.
     * @param {boolean} visible Set to `true` for the grid to be visible; `false` for the
     * grid to be invisible.
     */
    function setGridVisibility(visible: boolean): void {
        visibility(gridSceneId, visible);
        onGridVisibilityChange(visualizationId, visible)
    }

    /**
     * Calculates the coordinates of the camera based on the bounding sphere for the spiking network.
     * @return {Coordinate} The camera's coordinates
     */
    function cameraCoordinates(): Coordinate {
        return coordinateFrom(1, 1, 1)
            .scale(1.25 * boundingSphere.radius)
            .plus(boundingSphere.origin);
    }

    /**
     * Resets the camera position to the original, and has the camera look at the origin
     */
    function resetCameraPosition(): void {
        camera.ifSome(cam => {
            const position = cameraCoordinates();
            cam.position.set(position.x, position.y, position.z);
            cam.lookAt(new Vector3(boundingSphere.origin.x, boundingSphere.origin.y, boundingSphere.origin.z));
            cam.updateProjectionMatrix();
            onCameraUpdate(visualizationId, cam);
        })
    }


    const stackTokens: IStackTokens = {childrenGap: 20};
    return (
        <Stack tokens={stackTokens} horizontal>
            <Toggle
                label="Axes"
                inlineLabel
                checked={axesVisible}
                onChange={() => setAxesVisibility(!axesVisible)}
            />
            <Toggle
                label="Grid"
                inlineLabel
                checked={gridVisible}
                onChange={() => setGridVisibility(!gridVisible)}
            />
            <IconButton
                iconProps={{iconName: "reset"}}
                onClick={resetCameraPosition}>
            </IconButton>
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
 * @param state The application state from the redux root store
 * @param ownProps The Network components own properties (holding the visualization ID)
 * @return The updated the state-properties, which in our case is the network neurons and connections
 */
const mapStateToProps = (state: AppState, ownProps: OwnProps): StateProps => ({
    axesVisible: state.networkVisualizationEvent.states
        .get(ownProps.visualizationId)
        .map(vizState => vizState.axesVisible)
        .getOrElse(initialNetVisState.axesVisible),
    gridVisible: state.networkVisualizationEvent.states
        .get(ownProps.visualizationId)
        .map(vizState => vizState.gridVisible)
        .getOrElse(initialNetVisState.gridVisible),
    camera: state.networkVisualizationEvent.states
        .get(ownProps.visualizationId)
        .map(vizState => vizState.camera)
        .getOrElse(initialNetVisState.camera),
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param {ThunkDispatch} dispatch The redux dispatcher
 * @return {DispatchProps} The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<unknown, unknown, ApplicationAction>): DispatchProps => ({
    onAxisVisibilityChange: (id: string, visible: boolean) => dispatch(axesVisibilityChanged(id, visible)),
    onGridVisibilityChange: (id: string, visible: boolean) => dispatch(gridVisibilityChanged(id, visible)),
    onCameraUpdate: (id: string, camera: PerspectiveCamera) => dispatch(cameraUpdated(id, camera)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Controls)
