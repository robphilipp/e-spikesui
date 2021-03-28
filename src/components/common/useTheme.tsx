import * as React from 'react';
import {ITheme} from "@fluentui/react";
import {createContext, useContext, useState} from "react";
import {createDefaultTheme, createTheme, defaultPalettes, Palette} from "../../theming";
import {HashMap} from "prelude-ts";
import {readSettings} from "../repos/appSettingsRepo";

function noop() {
    /* empty */
}

interface UseThemeValues {
    themeName: string;
    itheme: ITheme;
    changeTheme: (themeName: string) => void;
    palettes: HashMap<string, Palette>;
    registerPalette: (name: string, palette: Palette) => void;
}

// todo this should be handled in the start-up so that we can throw up a loading model
// get the current theme name from the user's settings
const currentThemeName = readSettings().map(settings => settings.themeName).getOrElse('dark')

// create the default theme values for the hook
const defaultThemeValues: UseThemeValues = {
    themeName: currentThemeName,
    itheme: createDefaultTheme(currentThemeName).theme,
    palettes: defaultPalettes,
    changeTheme: noop,
    registerPalette: noop,
}

const ThemeContext = createContext<UseThemeValues>(defaultThemeValues)

interface Props {
    children: JSX.Element | Array<JSX.Element>;
}

/**
 * Provides the application UI theme information to its children
 * @param props The properties holding the children
 * @return The children wrapped in a theme-context provider
 * @constructor
 */
export default function ThemeProvider(props: Props): JSX.Element {
    const [themeName, setThemeName] = useState<string>(defaultThemeValues.themeName)
    const [itheme, setITheme] = useState<ITheme>(defaultThemeValues.itheme)
    const [palettes, setPalettes] = useState<HashMap<string, Palette>>(defaultThemeValues.palettes)

    function changeTheme(themeName: string): void {
        const {name, theme} = createTheme(themeName, palettes)
        setThemeName(name)
        setITheme(theme)
    }

    function registerPalette(name: string, palette: Palette): void {
        setPalettes(palettes.put(name, palette))
    }

    const {children} = props;
    return <ThemeContext.Provider value={{themeName, itheme, palettes, changeTheme, registerPalette}}>
        {children}
    </ThemeContext.Provider>
}

/**
 * React hook for managing the application UI theme
 * @return The theme context values: theme name, iTheme, palettes, and the functions to change the
 * theme and add palettes
 */
export function useTheme(): UseThemeValues {
    const context = useContext<UseThemeValues>(ThemeContext)
    const {changeTheme, registerPalette} = context
    if (changeTheme === undefined || registerPalette === undefined) {
        throw new Error("useTheme can only be used when the parent is a <ThemeProvider/>")
    }
    return context
}