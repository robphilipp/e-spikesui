import * as React from "react";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {connect} from "react-redux";
import {withRouter} from "react-router-dom";

interface OwnProps {

}

interface StateProps {

}

interface DispatchProps {

}

type Props = StateProps & DispatchProps & OwnProps;

function SimulationManager(props: Props): JSX.Element {

    return <div>Testing</div>
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
    // codeSnippet: state.sensorDescription.codeSnippet,
    // modified: state.sensorDescription.modified,
    // path: state.sensorDescription.path,
    // templatePath: state.settings.environment.templatePath
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    // onChanged: (codeSnippet: string) => dispatch(updateSensors(codeSnippet)),
    // onLoadTemplate: (path: string) => dispatch(loadSensorsFromTemplate(path)),
    // onLoadSensor: (path: string) => dispatch(loadSensorsFrom(path)),
    // onSave: (path: string, description: string) => dispatch(persistEnvironment(path, description)),
});

const connectedSimulationManager = connect(mapStateToProps, mapDispatchToProps)(SimulationManager);
export default withRouter(connectedSimulationManager);