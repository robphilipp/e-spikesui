import {IPartialTheme, ITheme, loadTheme} from '@fluentui/react';
import {HashMap} from "prelude-ts";
import {loadThemes, ThemeInfo} from "./components/repos/themeRepo";
import {defaultDarkTheme, defaultLightTheme} from "./components/editors/editorThemes";

export interface Palette {
    themePrimary: string;
    themeLighterAlt: string;
    themeLighter: string;
    themeLight: string;
    themeTertiary: string;
    themeSecondary: string;
    themeDarkAlt: string;
    themeDark: string;
    themeDarker: string;
    neutralLighterAlt: string;
    neutralLighter: string;
    neutralLight: string;
    neutralQuaternaryAlt: string;
    neutralQuaternary: string;
    neutralTertiaryAlt: string;
    neutralTertiary: string;
    neutralSecondary: string;
    neutralPrimaryAlt: string;
    neutralPrimary: string;
    neutralDark: string;
    black: string;
    white: string;
    redLight: string;
    redDark: string;
    red: string;
    greenLight: string;
    greenDark: string;
    green: string;
}

const darkSepiaPalette: Palette = {
    themePrimary: '#bdb3a2',
    themeLighterAlt: '#080706',
    themeLighter: '#1e1d1a',
    themeLight: '#393631',
    themeTertiary: '#716b61',
    themeSecondary: '#a69e8f',
    themeDarkAlt: '#c3baab',
    themeDark: '#cdc5b7',
    themeDarker: '#dad4c9',
    neutralLighterAlt: '#343434',
    neutralLighter: '#3d3d3d',
    neutralLight: '#4a4a4a',
    neutralQuaternaryAlt: '#525252',
    neutralQuaternary: '#595959',
    neutralTertiaryAlt: '#757575',
    neutralTertiary: '#f1ede3',
    neutralSecondary: '#f4f0e7',
    neutralPrimaryAlt: '#f6f3ec',
    neutralPrimary: '#ebe4d5',
    neutralDark: '#faf9f5',
    black: '#fdfcfa',
    white: '#2b2b2b',
    redLight: 'rgb(150,0,0)',
    red: '#f00',
    redDark: 'rgb(255,0,0)',
    greenLight: 'rgb(0,150,0)',
    green: '#3f3',
    greenDark: 'rgb(0,255,0)',
};

const lightPalette: Palette = {
    themePrimary: '#cf8304',
    themeLighterAlt: '#fdf9f3',
    themeLighter: '#f7e9d1',
    themeLight: '#f1d6aa',
    themeTertiary: '#e2b05d',
    themeSecondary: '#d5901d',
    themeDarkAlt: '#ba7604',
    themeDark: '#9d6303',
    themeDarker: '#744902',
    neutralLighterAlt: '#f8f8f8',
    neutralLighter: '#f4f4f4',
    neutralLight: '#eaeaea',
    neutralQuaternaryAlt: '#dadada',
    neutralQuaternary: '#d0d0d0',
    neutralTertiaryAlt: '#c8c8c8',
    neutralTertiary: '#bb9c7d',
    neutralSecondary: '#a5815d',
    neutralPrimaryAlt: '#8f6841',
    neutralPrimary: '#361c02',
    neutralDark: '#623d18',
    black: '#4c2c0b',
    white: '#ffffff',
    redLight: 'rgb(255,0,0)',
    red: '#f30',
    redDark: 'rgb(150, 0, 0)',
    greenLight: 'rgb(0,255,0)',
    green: '#090',
    greenDark: 'rgb(0,150,0)',
};

const defaultPalettes = HashMap.ofObjectDictionary<ThemeInfo>({
    "light": {name: "light", label: "Light Theme", palette: lightPalette, editor: defaultLightTheme},
    "darkSepia": {name: "darkSepia", label: "Dark Sepia Theme", palette: darkSepiaPalette, editor: defaultDarkTheme}
});


export const THEME_DIRECTORY = '.themes'
export function loadOrDefaultThemes(directory: string): HashMap<string, ThemeInfo> {
    return loadThemes(directory).getOrElse(defaultPalettes)
}

/**
 * Holds the current theme name and fabric-ui theme
 */
export interface AppTheme {
    name: string;
    theme: ITheme;
}

/**
 * Loads the theme, sets the default font, and sets the background to the theme's `white` color
 * @param name The name of the theme
 * @param palettes A map(theme_name -> fabric_ui_color_palette) holding the available themes
 * @return The actual theme
 */
export const createTheme = (name: string, palettes: HashMap<string, ThemeInfo>): AppTheme => {
    const palette: IPartialTheme = name === 'default' ? {
        defaultFontStyle: {fontFamily: '"Avenir Next", sans-serif', fontWeight: 400}
    } : {
        palette: palettes.get(name).map(tp => tp.palette).getOrElse(darkSepiaPalette),
        defaultFontStyle: {fontFamily: '"Avenir Next", sans-serif', fontWeight: 400}
    };
    const theme = loadTheme(palette);
    document.documentElement.style.setProperty('background', theme.palette.white);
    return {
        name: name,
        theme: theme
    };
};
