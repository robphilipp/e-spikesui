import * as React from 'react'
import * as ReactDOM from 'react-dom'
import Main from './components/Main'
import prepareIcons from "./icons";
import {createDefaultTheme, defaultPalettes, defaultTheme} from "./theming";
import {Provider} from "react-redux";
import store from './components/redux/store';
import {generateRemoteActionCreators} from './components/redux/actions/rootActions';
import {BrowserRouter} from "react-router-dom";
import {loadOrInitializeSetting} from "./components/settings/settings";

// set up and register all the icons for the application. the fabric-ui icons are
// copyrighted by microsoft and so we can't use them for non-microsoft-office
// development
prepareIcons();

// load the application settings/preferences from file, or if they aren't available,
// load the default settings and write the settings to disk
const applicationSettings = loadOrInitializeSetting();

// generate the wrapper so that action-creators can be enriched with the server
// settings
export const remoteActionCreators = generateRemoteActionCreators(applicationSettings.server);

ReactDOM.render(
    <Provider store={store}>
        <BrowserRouter>
            <Main
                theme={createDefaultTheme(defaultTheme)}
                colorPalettes={defaultPalettes}
            />
        </BrowserRouter>
    </Provider>,
    document.getElementById('root')
);