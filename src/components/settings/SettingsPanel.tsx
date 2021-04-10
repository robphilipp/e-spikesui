import * as React from "react";
import {useState} from "react";

import {
    DefaultButton,
    Dropdown,
    IDropdownOption,
    Label,
    MessageBar,
    MessageBarType,
    Panel,
    PanelType,
    PrimaryButton,
    Separator,
    Stack,
    StackItem
} from "@fluentui/react";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction} from "../redux/actions/actions";
import {connect} from "react-redux";
import {HashMap, Option} from 'prelude-ts';
import {
    changeKafkaSettings,
    changeServerSettings,
    hideSettingsPanel,
    showSettingsPanel,
    updateNetworkDescriptionTemplatePath,
    updateSensorDescriptionTemplatePath
} from "../redux/actions/settings";
import {KafkaSettings} from "./kafkaSettings";
import KafkaSettingsEditor from "./KafkaSettingsEditor";
import ServerSettings from "./serverSettings";
import ServerSettingsEditor from "./ServerSettingsEditor";
import {ApplicationSettings} from "./appSettings";
import {NetworkDescriptionSettings} from "./networkDescriptionSettings";
import TemplateSettingsEditor from "./TemplateSettingsEditor";
import TemplateSettings from "./templateSettings";
import {saveSettingsAsync} from "../repos/appSettingsRepo";
import {SensorDescriptionSettings} from "./sensorDescriptionSettings";
import {useTheme} from "../common/useTheme";
import {ThemePalette} from "../repos/themeRepo";

// const themes: IDropdownOption[] = [
//     {key: "default", text: "Default Theme"},
//     {key: "light", text: "Light Theme"},
//     {key: "dark", text: "Dark Theme"},
//     {key: "darkGray", text: "Dark Gray Theme"},
//     {key: "darkSepia", text: "Dark Sepia Theme"}
// ];

function dropDownOptionsFrom(palettes: HashMap<string, ThemePalette>): Array<IDropdownOption> {
    const options = [{key: "default", text: "Default Theme"}]
    const userOptions = Array
        .from(palettes.valueIterable())
        .map(tp => ({key: tp.name, text: tp.label}))
        .sort((a, b) => {
            if (a.text > b.text) return 1
            if (a.text < b.text) return -1
            return 0
        })
    return options.concat(userOptions)
}

interface OwnProps {
    nothing?: string
}

interface StateProps {
    settingsPanelVisible: boolean;
    // // current theme
    // itheme: ITheme;
    // // current theme name
    // name: string;
    // palettes: HashMap<string, Palette>;
    serverSettings: ServerSettings;
    kafkaSettings: KafkaSettings;
    templateSettings: TemplateSettings;
    networkDescriptionSettings: NetworkDescriptionSettings;
    environmentSettings: SensorDescriptionSettings;
}

interface DispatchProps {
    onShowSettingsPanel: () => void;
    onHideSettingsPanel: () => void;
    // onChangeTheme: (theme: string) => void;
    onChangeServerSettings: (settings: ServerSettings) => void;
    onChangeKafkaSettings: (settings: KafkaSettings) => void;
    // onChangeNetworkDescriptionSettings: (settings: NetworkDescriptionSettings) => void;
    onChangeTemplateSettings: (settings: TemplateSettings) => void;
}

type Props = StateProps & DispatchProps & OwnProps

/**
 * The settings panel for the application. Allows the user to set the theme, the
 * URL to the REST server, and the kafka broker locations.
 * @param props The properties for the settings panel.
 * @return The rendered settings panel
 * @constructor
 */
function SettingsPanel(props: Props): JSX.Element {
    const {
        // itheme,
        // name,
        settingsPanelVisible,
        // palettes,
        serverSettings,
        kafkaSettings,
        templateSettings,
        networkDescriptionSettings,
        environmentSettings,
        // onShowSettingsPanel,
        onHideSettingsPanel,
        // onChangeTheme,
        onChangeServerSettings,
        // onChangeKafkaSettings,
        onChangeTemplateSettings
        // onChangeNetworkDescriptionSettings
    } = props;

    const {themeName: name, itheme, changeTheme: onChangeTheme, palettes} = useTheme()

    // initially we start out with the current theme name to be an empty option. when
    // the user selects a theme, we update the current theme with the theme that
    // was originally set, before any changes were made. this update value signifies
    // that there has been a change, and holds the theme to revert to if the user cancels
    // from the theme.
    const [originalThemeName, setOriginalThemeName] = useState(Option.none<string>());
    const [themes, setThemes] = useState<Array<IDropdownOption>>(dropDownOptionsFrom(palettes))

    /*
const themes: IDropdownOption[] = [
    {key: "default", text: "Default Theme"},
    {key: "light", text: "Light Theme"},
    {key: "dark", text: "Dark Theme"},
    {key: "darkGray", text: "Dark Gray Theme"},
    {key: "darkSepia", text: "Dark Sepia Theme"}
];
     */

    // tracks the REST server settings so that changes can be reverted. unlike the theme,
    // changes to the server settings do not update the application state until the "Ok"
    // button is selected to save the changes
    const [originalServer, setOriginalServer] = useState(Option.none<ServerSettings>());
    const [currentServer, setCurrentServer] = useState<ServerSettings>(serverSettings);

    // tracks the changes to the network description template file
    const [originalTemplate, setOriginalTemplate] = useState(Option.none<TemplateSettings>());
    const [currentTemplate, setCurrentTemplate] = useState(templateSettings);

    // flag that is true when the settings are being saved to file, and an error message
    // for when there is an error saving the settings
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string>('');

    /**
     * Renders the footer content of the settings panel
     * @return The footer
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
                    <div/>
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
        originalThemeName.ifNone(() => setOriginalThemeName(Option.of(name)));

        // update the theme for display, but don't set it permanently
        onChangeTheme(option.key as string);
    }

    /**
     * When the server settings are changed, then
     * @param settings
     */
    function handleServerChange(settings: ServerSettings): void {
        originalServer.ifNone(() => setOriginalServer(Option.of(currentServer)));
        setCurrentServer(settings);
    }

    /**
     * When the template settings are changed, then update the original if this is the
     * first update, and set the current to the new value
     * @param settings The updated template settings
     */
    function handleTemplateChange(settings: TemplateSettings): void {
        originalTemplate.ifNone(() => setOriginalTemplate(Option.of(currentTemplate)));
        setCurrentTemplate(settings);
    }

    /**
     * Dispatches the action to hide the settings panel (all changes are already done)
     */
    function handleAcceptChanges() {
        // attempt to save the settings
        const newSettings: ApplicationSettings = {
            themeName: name,
            // server: serverSettings,
            server: currentServer,
            kafka: kafkaSettings,
            networkDescription: {...networkDescriptionSettings, templatePath: templateSettings.networkDescriptionPath},
            sensorDescription: {...environmentSettings, templatePath: templateSettings.sensorDescriptionPath},
        }
        setSaving(true);
        saveSettingsAsync(newSettings)
            .then(() => {
                setSaving(false)
                // accepting the changes, just leaves things as they were, but we need to set the
                // original theme name back to an empty optional to signify that there have been no
                // changes.
                onHideSettingsPanel();
                setOriginalThemeName(Option.none());

                // accept any changes to the server settings, if there were any, otherwise, do nothing.
                if (originalServer.isSome()) {
                    onChangeServerSettings(currentServer);
                    setOriginalServer(Option.none());
                }

                // accept any changes to the template settings, if there were any, otherwise, do nothing
                if (originalTemplate.isSome()) {
                    onChangeTemplateSettings(currentTemplate);
                    setOriginalTemplate(Option.none());
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
        originalThemeName.ifSome(theme => onChangeTheme(theme));
        onHideSettingsPanel();
        setOriginalThemeName(Option.none());

        // if there are changes to the server settings, we need to discard then and set the
        // the server settings back to their origin value, and clear the changes.
        originalServer.ifSome(settings => {
            setCurrentServer(settings);
            setOriginalServer(Option.none());
        });

        // if there are changes to the template settings, we need to discard then and set the
        // the template settings back to their origin value, and clear the changes.
        originalTemplate.ifSome(settings => {
            setCurrentTemplate(settings);
            setOriginalTemplate(Option.none());
        })

        // clear any previous error message
        setSaveError('');
    }

    return (
        <Panel
            isOpen={settingsPanelVisible}
            type={PanelType.medium}
            onDismiss={handleCancelChanges}
            headerText="Settings"
            closeButtonAriaLabel="Close"
            onRenderFooterContent={onRenderFooterContent}
            isFooterAtBottom={true}
        >
            <Stack tokens={{childrenGap: 20}}>
                <StackItem>
                    <Separator theme={itheme}>Look and feel</Separator>
                    <Label htmlFor={"theme-dropdown"}>Select a theme</Label>
                    <Dropdown
                        id={"theme-dropdown"}
                        dropdownWidth={200}
                        options={themes}
                        defaultSelectedKey={name}
                        selectedKey={name}
                        onChange={(event, option) => handleThemeChange(option)}
                    />
                </StackItem>
                <StackItem>
                    <Separator theme={itheme}>Server Settings</Separator>
                    <ServerSettingsEditor
                        theme={itheme}
                        settings={currentServer}
                        onChange={settings => handleServerChange(settings)}
                    />
                </StackItem>
                <StackItem>
                    <Separator theme={itheme}>Kafka Settings</Separator>
                    <Label>Kafka Brokers</Label>
                    <KafkaSettingsEditor/>
                </StackItem>
                <StackItem>
                    <Separator theme={itheme}>Templates</Separator>
                    <Label>Network Description Template</Label>
                    <TemplateSettingsEditor
                        theme={itheme}
                        settings={currentTemplate}
                        onChange={settings => handleTemplateChange(settings)}
                    />
                </StackItem>
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
        // itheme: state.settings.itheme,
        // name: state.settings.name,
        // palettes: state.settings.palettes,
        serverSettings: state.settings.server,
        kafkaSettings: state.settings.kafka,
        networkDescriptionSettings: state.settings.networkDescription,
        environmentSettings: state.settings.sensorDescription,
        templateSettings: {
            networkDescriptionPath: state.settings.networkDescription.templatePath,
            sensorDescriptionPath: state.settings.sensorDescription.templatePath,
        }
    }
}

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param dispatch The redux dispatcher
 * @return The updated dispatch-properties holding the event handlers
 */
function mapDispatchToProps(dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps {
    return {
        onShowSettingsPanel: () => dispatch(showSettingsPanel()),
        onHideSettingsPanel: () => dispatch(hideSettingsPanel()),
        // onChangeTheme: (theme: string) => dispatch(changeTheme(theme)),
        onChangeServerSettings: (settings: ServerSettings) => dispatch(changeServerSettings(settings)),
        onChangeKafkaSettings: (settings: KafkaSettings) => dispatch(changeKafkaSettings(settings)),
        onChangeTemplateSettings: (settings: TemplateSettings) => {
            dispatch(updateNetworkDescriptionTemplatePath(settings.networkDescriptionPath));
            dispatch(updateSensorDescriptionTemplatePath(settings.sensorDescriptionPath));
        },
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(SettingsPanel)
