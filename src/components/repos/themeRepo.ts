import {Either, HashMap} from 'prelude-ts'
import fs from 'fs'
import {Palette} from "../../theming";
import {editor} from "monaco-editor/esm/vs/editor/editor.api";

export const THEME_EXTENSION = '.json'

export interface ThemeInfo {
    name: string
    label: string
    palette: Palette
    editor: editor.IStandaloneThemeData
}

/**
 * Loads all the theme files in the specified directory that end in `.json`. The theme files
 * provide the theme name, a label that is displayed to the user for selecting the theme, a
 * palette of colors, and settings for the theming information for the monaco editors.
 *
 * For an easy way to generate the palettes, see the
 * [UI Theme designer](https://fabricweb.z5.web.core.windows.net/pr-deploy-site/refs/heads/master/theming-designer/index.html).
 *
 * For a list of colors for the monaco editor, see the
 * [Monaco Editor playground](https://microsoft.github.io/monaco-editor/playground.html#customizing-the-appearence-exposed-colors)
 *
 * @param directory The director in which to search for theme files.
 * @return Either an error message or a map(theme_name -> theme_info)
 */
export function loadThemes(directory: string): Either<string, HashMap<string, ThemeInfo>> {
    try {
        const results: Array<Either<string, ThemeInfo>> = fs.readdirSync(directory)
            .filter(file => file.endsWith(THEME_EXTENSION))
            .map(file => loadTheme(`${directory}/${file}`))

        // todo handle this in a better way
        // log the error results
        results.forEach(result => result.ifLeft(res => console.error(res)))

        const entries: Array<[string, ThemeInfo]> = results
            .filter(result => result.isRight())
            .map(result => result
                .map(themePalette => [themePalette.name, themePalette] as [string, ThemeInfo])
                .getOrThrow("won't happen")
            )

        console.log(`Loaded themes: [${entries.map(entry => entry[0]).join(", ")}]`)

        return Either.right(HashMap.ofIterable(entries))
    } catch(err) {
        return Either.left(err.toString())
    }
}

/**
 * Loads the individual theme file
 * @param filename The name of the theme file to load
 * @return Either an error message or the theme information
 */
export function loadTheme(filename: string): Either<string, ThemeInfo> {
    try {
        const buffer = fs.readFileSync(filename)
        const palette: ThemeInfo = JSON.parse(buffer.toString())
        return Either.right(palette)
    } catch(err) {
        return Either.left(err.toString())
    }

}