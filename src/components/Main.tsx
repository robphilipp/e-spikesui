import * as React from 'react'
import {FontIcon, ITheme, Label} from '@fluentui/react'
import {iconControlsClass} from "../icons";
import {AppTheme, Palette} from "../theming";
import { connect } from 'react-redux';
import {AppState} from "./redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {changeTheme, hideSettingsPanel, showSettingsPanel} from "./redux/actions/settings";
import {ApplicationAction, clearErrorMessages} from "./redux/actions/actions";
import {HashMap} from "prelude-ts";


interface OwnProps {
    theme: AppTheme;
    colorPalettes: HashMap<string, Palette>
}

interface StateProps {
    // // holds an error message
    // errorMessages: Option<string[]>;

    // determines if the application settings panel is visible
    settingsPanelVisible: boolean;
    // the current theme
    itheme: ITheme;
    // the name of the current theme
    name: string;
    // the current map of the theme names and their associated color palettes
    palettes: HashMap<string, Palette>;
}

interface DispatchProps {
    onClearErrorMessages: () => void;
    onShowSettingsPanel: () => void;
    onHideSettingsPanel: () => void;
    onChangeTheme: (theme: string) => void;
}

type Props = StateProps & DispatchProps & OwnProps;

function Main(props: Props): JSX.Element {

    return (
        <div>
            <Label>This is a label<FontIcon iconName="check-square" className={iconControlsClass}/></Label>
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
 * @param ownProps The current properties of the `App` component
 */
const mapStateToProps = (state: AppState, ownProps: OwnProps): StateProps => ({
    ...ownProps,
    // errorMessages: state.application.errorMessages,
    settingsPanelVisible: state.application.settingsPanelVisible,
    itheme: state.settings.itheme,
    name: state.settings.name,
    palettes: state.settings.palettes
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param {ThunkDispatch} dispatch The redux dispatcher
 * @param {OwnProps} _ The component's own properties
 * @return {DispatchProps} The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    onClearErrorMessages: () => dispatch(clearErrorMessages()),
    onShowSettingsPanel: () => dispatch(showSettingsPanel()),
    onHideSettingsPanel: () => dispatch(hideSettingsPanel()),
    onChangeTheme: (theme: string) => dispatch(changeTheme(theme))
});

export default connect(mapStateToProps, mapDispatchToProps)(Main)
