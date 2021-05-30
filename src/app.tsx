import * as React from 'react'
import * as ReactDOM from 'react-dom'
import Main from './components/Main'
import prepareIcons from "./icons";
import {loadOrDefaultThemes, THEME_DIRECTORY} from "./theming";
import {Provider} from "react-redux";
import store from './components/redux/store';
import {generateRemoteActionCreators} from './components/redux/actions/rootActions';
import {HashRouter as Router} from "react-router-dom";
import {loadOrInitializeSetting} from "./components/settings/appSettings";
import {createRemoteRepositories} from "./components/repos/remoteRepositories";
import ThemeProvider from "./components/common/useTheme";
import {WindowDimensionsProvider} from 'react-resizable-grid-layout';

// set up and register all the icons for the application. the fabric-ui icons are
// copyrighted by microsoft and so we can't use them for non-microsoft-office
// development
prepareIcons();

// load the application settings/preferences from file, or if they aren't available,
// load the default settings and write the settings to disk
const applicationSettings = loadOrInitializeSetting();

// generate the wrapper so that action-creators can be enriched with the server settings
// export const remoteActionCreators = generateRemoteActionCreators(applicationSettings.server);
export const remoteActionCreators = generateRemoteActionCreators();

// generator the closure on the server settings for the remote repositories
export const remoteRepositories = createRemoteRepositories(applicationSettings.server);

// loads the themes from the theme directory, or supplies the default themes in the theming.ts file
const palettes = loadOrDefaultThemes(THEME_DIRECTORY)

ReactDOM.render(
    <Provider store={store}>
        <Router>
            <ThemeProvider initialTheme={applicationSettings.themeName} initialPalettes={palettes}>
                <WindowDimensionsProvider>
                    <Main/>
                </WindowDimensionsProvider>
            </ThemeProvider>
        </Router>
    </Provider>,
    document.getElementById('root')
);