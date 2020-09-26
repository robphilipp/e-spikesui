import * as React from "react";
import {useState} from "react";

import {
    Stack,
    DefaultButton,
    Dropdown,
    IDropdownOption,
    ITheme, Label,
    Panel,
    PanelType,
    PrimaryButton, Separator, IStackTokens
} from "@fluentui/react";
// import {AppUiState} from "../../App";
// import {AppUiContext} from "../../app-ui-context";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {connect} from "react-redux";
import {Palette} from "../../theming";
import {HashMap, Option} from 'prelude-ts';
import {changeTheme, hideSettingsPanel, changeKafkaSettings, showSettingsPanel} from "../redux/actions/settings";
import {KafkaSettings} from "./KafkaSettings";
import KafkaSettingsEditor from "./KafkaSettingsEditor";

const themes: IDropdownOption[] = [
    {key: "default", text: "Default Theme"},
    {key: "light", text: "Light Theme"},
    {key: "dark", text: "Dark Theme"}
];

interface OwnProps {
    nothing?: string
}

interface StateProps {
    settingsPanelVisible: boolean;
    // current theme
    itheme: ITheme;
    // current theme name
    name: string;
    palettes: HashMap<string, Palette>;
    kafkaSettings: KafkaSettings;
}

interface DispatchProps {
    onShowSettingsPanel: () => void;
    onHideSettingsPanel: () => void;
    onChangeTheme: (theme: string) => void;
    onChangeKafkaSettings: (settings: KafkaSettings) => void;
}

type Props = StateProps & DispatchProps & OwnProps

/**
 * The settings panel for the application. Allows the user to set the theme.
 * @return {Element} The rendered settings panel
 * @constructor
 */
function SettingsPanel(props: Props): JSX.Element {
    // initially we start out with the current theme name to be an empty option. when
    // the user selects a theme, then we update the current theme with the theme that
    // was originally set, before any changes were made. this update value signifies
    // that there has been a change, and holds the theme to revert to if the user cancels
    // from the theme.
    const [currentThemeName, setCurrentThemeName] = useState(Option.none<string>());

    /**
     * Renders the footer content of the settings panel
     * @return {Element} The footer
     */
    const onRenderFooterContent = (): JSX.Element => (
        <div>
            <PrimaryButton
                onClick={handleAcceptChanges}
                iconProps={{iconName: 'CompletedSolid'}}
                style={{marginRight: '8px'}}
            >
                OK
            </PrimaryButton>
            <DefaultButton
                onClick={handleCancelChanges}
                iconProps={{iconName: 'StatusErrorFull'}}
            >
                Cancel
            </DefaultButton>
        </div>
    );

    /**
     * Calls the theme changer callback function passed down through the react context
     * @param option The value of the selected theme
     */
    function handleThemeChange(option: IDropdownOption | undefined) {
        if (option === undefined) {
            return;
        }
        // if this is the first change before selecting "accept" or "cancel", then
        // we grab the name of the current theme
        currentThemeName.ifNone(() => setCurrentThemeName(Option.of(props.name)));

        // update the theme for display, but don't set it permanently
        props.onChangeTheme(option.key as string);
    }

    /**
     * Dispatches the action to hide the settings panel (all changes are already done)
     */
    function handleAcceptChanges() {
        // accepting the changes, just leaves things as they were, but we need to set the
        // current theme name back to an empty optional to signify that there have been on
        // changes.
        props.onHideSettingsPanel();
        setCurrentThemeName(Option.none());
    }

    /**
     * Dispatches the actions to revert all the theme changes, and then dispatches the
     * action to hide the panel
     */
    function handleCancelChanges() {
        // if there are changes to the theme (i.e. the current theme name is not an empty
        // optional), then we set the theme back to the original theme, and update the
        // current theme back to an empty optional to signify that the were no changes
        currentThemeName.ifSome(theme => props.onChangeTheme(theme));
        props.onHideSettingsPanel();
        setCurrentThemeName(Option.none());
    }

    const stackTokens: IStackTokens = {childrenGap: 20};
    return (
        // <AppUiContext.Consumer>
        //     {(_: AppUiState) => (
                <Panel
                    isOpen={props.settingsPanelVisible}
                    type={PanelType.medium}
                    onDismiss={handleCancelChanges}
                    headerText="Settings"
                    closeButtonAriaLabel="Close"
                    onRenderFooterContent={onRenderFooterContent}
                    isFooterAtBottom={true}
                >
                    <Stack tokens={stackTokens}>
                        <Stack.Item>
                            <Separator theme={props.itheme}>Look and feel</Separator>
                            <Label htmlFor={"theme-dropdown"}>Select a theme</Label>
                            <Dropdown
                                id={"theme-dropdown"}
                                dropdownWidth={200}
                                options={themes}
                                defaultSelectedKey={props.name}
                                onChange={(event, option) => handleThemeChange(option)}
                            />
                        </Stack.Item>
                        <Stack.Item>
                            <Separator theme={props.itheme}>Advanced</Separator>
                            <Label>Kafka Brokers</Label>
                            <KafkaSettingsEditor/>
                        </Stack.Item>
                    </Stack>
                </Panel>
            // )}
        // </AppUiContext.Consumer>
    );
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
    settingsPanelVisible: state.application.settingsPanelVisible,
    itheme: state.settings.itheme,
    name: state.settings.name,
    palettes: state.settings.palettes,
    kafkaSettings: state.settings.kafka
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param {ThunkDispatch} dispatch The redux dispatcher
 * @param {OwnProps} ownProps The components own properties
 * @return {DispatchProps} The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<any, any, ApplicationAction>, ownProps: OwnProps): DispatchProps => ({
    onShowSettingsPanel: () => dispatch(showSettingsPanel()),
    onHideSettingsPanel: () => dispatch(hideSettingsPanel()),
    onChangeTheme: (theme: string) => dispatch(changeTheme(theme)),
    onChangeKafkaSettings: (settings: KafkaSettings) => dispatch(changeKafkaSettings(settings))
});

export default connect(mapStateToProps, mapDispatchToProps)(SettingsPanel)
