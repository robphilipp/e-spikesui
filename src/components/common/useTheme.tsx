import * as React from 'react';
import {ITheme} from "@fluentui/react";
import {createContext, useContext, useState} from "react";
import {createDefaultTheme, createTheme, defaultPalettes, Palette} from "../../theming";
import {HashMap} from "prelude-ts";

interface UseThemeValues {
    themeName: string;
    itheme: ITheme;
    changeTheme: (themeName: string) => void;
    palettes: HashMap<string, Palette>;
    addPalette: (name: string, palette: Palette) => void;
}

const DEFAULT_THEME_NAME = 'dark'
function noop() {
    /* empty */
}

const defaultThemeValues: UseThemeValues = {
    themeName: DEFAULT_THEME_NAME,
    itheme: createDefaultTheme(DEFAULT_THEME_NAME).theme,
    palettes: defaultPalettes,
    changeTheme: noop,
    addPalette: noop,
}

const ThemeContext = createContext<UseThemeValues>(defaultThemeValues)

interface Props {
    children: JSX.Element | Array<JSX.Element>;
}

export default function ThemeProvider(props: Props): JSX.Element {
    const [themeName, setThemeName] = useState<string>(defaultThemeValues.themeName)
    const [itheme, setITheme] = useState<ITheme>(defaultThemeValues.itheme)
    const [palettes, setPalettes] = useState<HashMap<string, Palette>>(defaultThemeValues.palettes)

    function changeTheme(themeName: string): void {
        const {name, theme} = createTheme(themeName, palettes)
        setThemeName(name)
        setITheme(theme)
    }

    function addPalette(name: string, palette: Palette): void {
        setPalettes(palettes.put(name, palette))
    }

    const {children} = props;
    return <ThemeContext.Provider value={{themeName, itheme, palettes, changeTheme, addPalette}}>
        {children}
    </ThemeContext.Provider>
}

export function useTheme(): UseThemeValues {
    const context = useContext<UseThemeValues>(ThemeContext)
    const {changeTheme, addPalette} = context
    if (changeTheme === undefined || addPalette === undefined) {
        throw new Error("useTheme can only be used when the parent is a <ThemeProvider/>")
    }
    return context
}