import * as React from 'react'
import * as ReactDOM from 'react-dom'
import Main from './components/Main'
import prepareIcons from "./icons";
import {createDefaultTheme, defaultPalettes, defaultTheme} from "./theming";
import {Provider} from "react-redux";
import store from './components/redux/store';

// set up and register all the icons for the application
prepareIcons();

ReactDOM.render(
    <Provider store={store}>
        <Main
            theme={createDefaultTheme(defaultTheme)}
            colorPalettes={defaultPalettes}
        />
    </Provider>,
    document.getElementById('root')
);