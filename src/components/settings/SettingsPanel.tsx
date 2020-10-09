import * as React from "react";
import {useState} from "react";

import {
    DefaultButton,
    Dropdown,
    IDropdownOption,
    IStackTokens,
    ITheme,
    Label,
    MessageBar,
    MessageBarType,
    Panel,
    PanelType,
    PrimaryButton,
    Separator,
    Stack
} from "@fluentui/react";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {connect} from "react-redux";
import {Palette} from "../../theming";
import {HashMap, Option} from 'prelude-ts';
import {
    changeKafkaSettings,
    changeServerSettings,
    changeTheme,
    hideSettingsPanel,
    showSettingsPanel
} from "../redux/actions/settings";
import {KafkaSettings} from "./kafkaSettings";
import KafkaSettingsEditor from "./KafkaSettingsEditor";
import ServerSettings from "./serverSettings";
import ServerSettingsEditor from "./ServerSettingsEditor";
import {saveSettings, saveSettingsAsync} from "./appSettings";

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
    serverSettings: ServerSettings;
    kafkaSettings: KafkaSettings;
}

interface DispatchProps {
    onShowSettingsPanel: () => void;
    onHideSettingsPanel: () => void;
    onChangeTheme: (theme: string) => void;
    onChangeServerSettings: (settings: ServerSettings) => void;
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
    // the user selects a theme, we update the current theme with the theme that
    // was originally set, before any changes were made. this update value signifies
    // that there has been a change, and holds the theme to revert to if the user cancels
    // from the theme.
    const [originalThemeName, setOriginalThemeName] = useState(Option.none<string>());

    const [originalServer, setOriginalServer] = useState(Option.none<ServerSettings>());
    const [currentServer, setCurrentServer] = useState<ServerSettings>(props.serverSettings);

    // flag that is true when the settings are being saved to file, and an error message
    // for when there is an error saving the settings
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string>('');

    /**
     * Renders the footer content of the settings panel
     * @return {Element} The footer
     */
    function onRenderFooterContent(): JSX.Element {
        return (
            <Stack horizontal={true} tokens={{childrenGap: 8}}>
                <PrimaryButton
                    onClick={handleAcceptChanges}
                    iconProps={{iconName: 'CompletedSolid'}}
                    disabled={saving}
                >
                    OK
                </PrimaryButton>
                <DefaultButton
                    onClick={handleCancelChanges}
                    iconProps={{iconName: 'StatusErrorFull'}}
                    disabled={saving}
                >
                    Cancel
                </DefaultButton>
                {saveError.length > 0 ?
                    <MessageBar
                        messageBarType={MessageBarType.error}
                        isMultiline={false}
                        onDismiss={() => setSaveError('')}
                        dismissButtonAriaLabel="Close"
                        styles={{icon: {margin: 0, fontSize: 12}}}
                    >
                        {saveError}
                    </MessageBar> :
                    <div></div>
                }
            </Stack>
        )
    }

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
        originalThemeName.ifNone(() => setOriginalThemeName(Option.of(props.name)));

        // update the theme for display, but don't set it permanently
        props.onChangeTheme(option.key as string);
    }

    /**
     * When the server settings are changed, then
     * @param {ServerSettings} settings
     */
    function handleServerChange(settings: ServerSettings): void {
        originalServer.ifNone(() => setOriginalServer(Option.of(currentServer)));
        setCurrentServer(settings);
    }

    /**
     * Dispatches the action to hide the settings panel (all changes are already done)
     */
    function handleAcceptChanges() {
        // attempt to save the settings
        const newSettings = {
            themeName: props.name,
            server: props.serverSettings,
            kafka: props.kafkaSettings
        }
        setSaving(true);
        saveSettingsAsync(newSettings)
            .then(() => {
                setSaving(false)
                // accepting the changes, just leaves things as they were, but we need to set the
                // original theme name back to an empty optional to signify that there have been no
                // changes.
                props.onHideSettingsPanel();
                setOriginalThemeName(Option.none());

                // accept any changes to the server settings, if there were any, otherwise, do nothing.
                if (originalServer.isSome()) {
                    props.onChangeServerSettings(currentServer);
                    setOriginalServer(Option.none());
                }

                // clear any previous error message
                setSaveError('');
            })
            .catch(reason => {
                setSaving(false)
                setSaveError(reason);
            })
        ;
    }

    /**
     * Dispatches the actions to revert all the theme changes, and then dispatches the
     * action to hide the panel
     */
    function handleCancelChanges() {
        // if there are changes to the theme (i.e. the original theme name is not an empty
        // optional), then we set the theme back to the original theme, and update the
        // original theme back to an empty optional to signify that the were no changes
        originalThemeName.ifSome(theme => props.onChangeTheme(theme));
        props.onHideSettingsPanel();
        setOriginalThemeName(Option.none());

        // if there are changes to the server settings, we need to discard then and set the
        // the server settings back to their origin value, and clear the changes.
        originalServer.ifSome(settings => {
            setCurrentServer(settings);
            setOriginalServer(Option.none());
        });

        // clear any previous error message
        setSaveError('');
    }

    const stackTokens: IStackTokens = {childrenGap: 20};
    return (
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
                        selectedKey={props.name}
                        onChange={(event, option) => handleThemeChange(option)}
                    />
                </Stack.Item>
                <Stack.Item>
                    <Separator theme={props.itheme}>Server Settings</Separator>
                    <ServerSettingsEditor
                        theme={props.itheme}
                        settings={currentServer}
                        onChange={settings => handleServerChange(settings)}
                    />
                </Stack.Item>
                <Stack.Item>
                    <Separator theme={props.itheme}>Kafka Settings</Separator>
                    <Label>Kafka Brokers</Label>
                    <KafkaSettingsEditor/>
                </Stack.Item>
            </Stack>
        </Panel>
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
function mapStateToProps(state: AppState, ownProps: OwnProps): StateProps {
    return {
        ...ownProps,
        settingsPanelVisible: state.application.settingsPanelVisible,
        itheme: state.settings.itheme,
        name: state.settings.name,
        palettes: state.settings.palettes,
        serverSettings: state.settings.server,
        kafkaSettings: state.settings.kafka
    }
}

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param {ThunkDispatch} dispatch The redux dispatcher
 * @param {OwnProps} ownProps The components own properties
 * @return {DispatchProps} The updated dispatch-properties holding the event handlers
 */
function mapDispatchToProps(dispatch: ThunkDispatch<any, any, ApplicationAction>, ownProps: OwnProps): DispatchProps {
    return {
        onShowSettingsPanel: () => dispatch(showSettingsPanel()),
        onHideSettingsPanel: () => dispatch(hideSettingsPanel()),
        onChangeTheme: (theme: string) => dispatch(changeTheme(theme)),
        onChangeServerSettings: (settings: ServerSettings) => dispatch(changeServerSettings(settings)),
        onChangeKafkaSettings: (settings: KafkaSettings) => dispatch(changeKafkaSettings(settings))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(SettingsPanel)
