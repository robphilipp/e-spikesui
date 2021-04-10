import {Either, HashMap} from 'prelude-ts'
import fs from 'fs'
import {Palette} from "../../theming";

export const THEME_EXTENSION = '.json'

export interface ThemePalette {
    name: string,
    label: string,
    palette: Palette
}

export function loadPalettes(directory: string): Either<string, HashMap<string, ThemePalette>> {
    try {
        const results: Array<Either<string, ThemePalette>> = fs.readdirSync(directory)
            .filter(file => file.endsWith(THEME_EXTENSION))
            .map(file => loadPalette(`${directory}/${file}`))

        // todo handle this in a better way
        // log the error results
        results.forEach(result => result.ifLeft(res => console.error(res)))

        const entries: Array<[string, ThemePalette]> = results
            .filter(result => result.isRight())
            .map(result => result
                .map(themePalette => [themePalette.name, themePalette] as [string, ThemePalette])
                .getOrThrow("won't happen")
            )

        console.log(`Loaded themes: [${entries.map(entry => entry[0]).join(", ")}]`)

        return Either.right(HashMap.ofIterable(entries))
    } catch(err) {
        return Either.left(err.toString())
    }
}

export function loadPalette(filename: string): Either<string, ThemePalette> {
    try {
        const buffer = fs.readFileSync(filename)
        const palette: ThemePalette = JSON.parse(buffer.toString())
        return Either.right(palette)
    } catch(err) {
        return Either.left(err.toString())
    }

}