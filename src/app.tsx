import * as React from 'react'
import * as ReactDOM from 'react-dom'
import Main from './components/Main'
import prepareIcons from "./icons";
import {createDefaultTheme, defaultPalettes, defaultTheme} from "./theming";
import {Provider} from "react-redux";
import store from './components/redux/store';
import {generateRemoteActionCreators} from './components/redux/actions/rootActions';
import ServerSettings from "./components/settings/ServerSettings";
import {BrowserRouter} from "react-router-dom";

// set up and register all the icons for the application. the fabric-ui icons are
// copyrighted by microsoft and so we can't use them for non-microsoft-office
// development
prepareIcons();

// this application needs to connect to a spikes neural network server that creates,
// executes, and accepts sensor signals from this application. the server settings
// hold the URL components to connect to this REST service.
const serverSettings: ServerSettings = {
    host: 'localhost',
    port: 3000,
    // port: 8080,
    basePath: ''
};

// generate the wrapper so that action-creators can be enriched with the server
// settings
export const remoteActionCreators = generateRemoteActionCreators(serverSettings);

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