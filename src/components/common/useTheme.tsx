import * as React from 'react';
import {createContext, useContext, useState} from 'react';
import {ITheme} from "@fluentui/react";
import {createDefaultTheme, createTheme, Palette} from "../../theming";
import {HashMap} from "prelude-ts";
import {ThemePalette} from "../repos/themeRepo";

function noop() {
    /* empty */
}

interface UseThemeValues {
    themeName: string;
    itheme: ITheme;
    changeTheme: (themeName: string) => void;
    palettes: HashMap<string, ThemePalette>;
    registerPalette: (name: string, label: string, palette: Palette) => void;
}

// create the default theme values for the hook
const defaultThemeValues: UseThemeValues = {
    themeName: null,
    itheme: null,
    // palettes: defaultPalettes,
    palettes: HashMap.empty(),
    changeTheme: noop,
    registerPalette: noop,
}
// const defaultThemeValues: UseThemeValues = {
//     themeName: 'dark',
//     itheme: createDefaultTheme('dark').theme,
//     // palettes: defaultPalettes,
//     palettes: HashMap.empty(),
//     changeTheme: noop,
//     registerPalette: noop,
// }

const ThemeContext = createContext<UseThemeValues>(defaultThemeValues)

interface Props {
    initialTheme: string
    initialPalettes: HashMap<string, ThemePalette>
    children: JSX.Element | Array<JSX.Element>
}

/**
 * Provides the application UI theme information to its children
 * @param props The properties holding the children
 * @return The children wrapped in a theme-context provider
 * @constructor
 */
export default function ThemeProvider(props: Props): JSX.Element {
    const {initialTheme, initialPalettes} = props;

    const [themeName, setThemeName] = useState<string>(initialTheme)
    const [itheme, setITheme] = useState<ITheme>(() => createDefaultTheme(initialTheme).theme)
    const [palettes, setPalettes] = useState<HashMap<string, ThemePalette>>(initialPalettes)
    // const [palettes, setPalettes] = useState<HashMap<string, Palette>>(defaultPalettes)

    /**
     * Changes the theme to the one with the specified name
     * @param themeName The name of the new theme
     */
    function changeTheme(themeName: string): void {
        const {name, theme} = createTheme(themeName, palettes)
        setThemeName(name)
        setITheme(theme)
    }

    /**
     * Register the new palette with the provider
     * @param name The name of the palette
     * @param palette The color palette
     */
    function registerPalette(name: string, label: string, palette: Palette): void {
        setPalettes(palettes.put(name, {name, label, palette}))
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