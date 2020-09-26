import * as React from 'react'
import {CommandBar, FontIcon, ITheme, Label, MessageBar, MessageBarType, Stack} from '@fluentui/react'
import {iconControlsClass} from "../icons";
import {AppTheme, Palette} from "../theming";
import { connect } from 'react-redux';
import {AppState} from "./redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {changeTheme, hideSettingsPanel, showSettingsPanel} from "./redux/actions/settings";
import {ApplicationAction, clearErrorMessages} from "./redux/actions/actions";
import {HashMap, Option} from "prelude-ts";
import SettingsPanel from "./settings/SettingsPanel";


interface OwnProps {
    theme: AppTheme;
    colorPalettes: HashMap<string, Palette>
}

interface StateProps {
    // holds an error message
    errorMessages: Option<string[]>;

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

    /**
     * Returns a list of menu items at the top of the page
     * @param {Props} props
     * @return {{onClick: () => void; cacheKey: string; name: string; iconProps: {iconName: string}; key: string; ariaLabel: string}[]}
     */
    function menuItems(props: Props) {
        return [
            {
                key: 'newNetwork',
                name: 'New',
                cacheKey: 'new-network-cache-key',
                iconProps: {
                    iconName: 'Add'
                },
                ariaLabel: 'New',
                // onClick: () => props.history.push('spikes-chart')
                // href: 'spikes-chart',
                // subMenuProps: {
                //     items: [
                //
                //     ]
                // }
            }
        ];
    }

    /**
     * Returns a list of menu items on the upper right-hand side of the menu bar. For example, returns the settings
     * menu item.
     * @param {(visible: boolean) => void} settingVisibilityManager Manages the settings panel visibility state
     * @return {{onClick: () => void; iconOnly: boolean; name: string; iconProps: {iconName: string}; key: string; ariaLabel: string}[]}
     */
    function farMenuItems(settingVisibilityManager: (visible: boolean) => void) {
        return [
            {
                key: 'settings',
                name: 'Settings',
                ariaLabel: 'Settings',
                iconProps: {
                    iconName: 'Settings'
                },
                iconOnly: true,
                onClick: () => settingVisibilityManager(true)
            }
        ];
    }

    function handleSettingsPanelVisibility(): void {
        props.settingsPanelVisible ? props.onHideSettingsPanel() : props.onShowSettingsPanel();
    }

    return (
        <Stack>
            <Stack.Item>
                {props.errorMessages.map(messages => (
                    <MessageBar
                        key="error-messages"
                        messageBarType={MessageBarType.blocked}
                        isMultiline={false}
                        truncated={true}
                        theme={props.itheme}
                        onDismiss={props.onClearErrorMessages}
                        dismissButtonAriaLabel="Close"
                        overflowButtonAriaLabel="See more"
                    >
                        {messages}
                    </MessageBar>
                )).getOrElse((<div/>))}
            </Stack.Item>
            <Stack.Item>
                <CommandBar
                    items={menuItems(props)}
                    farItems={farMenuItems(handleSettingsPanelVisibility)}
                />
            </Stack.Item>
            <Stack.Item grow>
                <SettingsPanel/>
            </Stack.Item>
            <Label>This is a label<FontIcon iconName="check-square" className={iconControlsClass}/></Label>
        </Stack>
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
    errorMessages: state.application.errorMessages,
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
