import {Either, HashMap} from 'prelude-ts'
import fs from 'fs'
import {Palette} from "../../theming";
import {editor} from "monaco-editor";

export const THEME_EXTENSION = '.json'

export interface ThemeInfo {
    name: string
    label: string
    palette: Palette
    editor: editor.IStandaloneThemeData
}

export function loadPalettes(directory: string): Either<string, HashMap<string, ThemeInfo>> {
    try {
        const results: Array<Either<string, ThemeInfo>> = fs.readdirSync(directory)
            .filter(file => file.endsWith(THEME_EXTENSION))
            .map(file => loadPalette(`${directory}/${file}`))

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

export function loadPalette(filename: string): Either<string, ThemeInfo> {
    try {
        const buffer = fs.readFileSync(filename)
        const palette: ThemeInfo = JSON.parse(buffer.toString())
        return Either.right(palette)
    } catch(err) {
        return Either.left(err.toString())
    }

}