import {IPartialTheme, ITheme, loadTheme} from '@fluentui/react';
import {HashMap} from "prelude-ts";

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

const darkPalette: Palette = {
    themePrimary: '#e08c00',
    themeLighterAlt: '#090600',
    themeLighter: '#241600',
    themeLight: '#432a00',
    themeTertiary: '#875400',
    themeSecondary: '#c57b00',
    themeDarkAlt: '#e39617',
    themeDark: '#e8a538',
    themeDarker: '#eebc69',
    neutralLighterAlt: '#3f3c3c',
    neutralLighter: '#474444',
    neutralLight: '#535050',
    neutralQuaternaryAlt: '#5b5858',
    neutralQuaternary: '#625e5e',
    neutralTertiaryAlt: '#7c7979',
    neutralTertiary: '#fbf0e5',
    neutralSecondary: '#fcf3ea',
    neutralPrimaryAlt: '#fdf5ee',
    neutralPrimary: '#fae9d9',
    neutralDark: '#fefaf6',
    black: '#fefcfa',
    white: '#2b2b2b',
    redLight: 'rgb(150,0,0)',
    red: 'rgb(210,0,0)',
    redDark: 'rgb(255,0,0)',
    greenLight: 'rgb(0,150,0)',
    green: 'rgb(0,200,0)',
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
    red: 'rgb(200,0,0)',
    redDark: 'rgb(150, 0, 0)',
    greenLight: 'rgb(0,255,0)',
    green: 'rgb(0,200,0)',
    greenDark: 'rgb(0,150,0)',
};

export const defaultTheme = "dark";
export const defaultPalettes = HashMap.ofObjectDictionary<Palette>({
    "light": lightPalette,
    "dark": darkPalette
});

/**
 * Holds the current theme name and fabric-ui theme
 */
export interface AppTheme {
    name: string;
    theme: ITheme;
}

/**
 * Loads the default theme and sets the background to the theme's `white` color
 * @param name The name of the theme
 * @return The actual theme
 */
export const createDefaultTheme = (name: string): AppTheme => {
    return createTheme(name, defaultPalettes);
};


/**
 * Loads the theme, sets the default font, and sets the background to the theme's `white` color
 * @param name The name of the theme
 * @param palettes A map(theme_name -> fabric_ui_color_palette) holding the available themes
 * @return The actual theme
 */
export const createTheme = (name: string, palettes: HashMap<string, Palette>): AppTheme => {
    const palette: IPartialTheme = name === 'default' ? {
        defaultFontStyle: {fontFamily: '"Avenir Next", sans-serif', fontWeight: 400}
    } : {
        palette: palettes.get(name).getOrElse(darkPalette),
        defaultFontStyle: {fontFamily: '"Avenir Next", sans-serif', fontWeight: 400}
    };
    const theme = loadTheme(palette);
    document.documentElement.style.setProperty('background', theme.palette.white);
    return {
        name: name,
        theme: theme
    };
};
