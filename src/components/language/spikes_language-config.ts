import {languages} from "monaco-editor";

export const spikesLanguage: languages.LanguageConfiguration = {
    comments: {lineComment: '//'},
    brackets: [
        ['[', ']'],
        ['(', ')'],
        ['{', '}']
    ],
    wordPattern: /\s*(,|\(\[)\s*([a-zA-Z0-9.\-_ϕθµ/ ]+)(\s*=(\s*[a-zA-Z0-9.\-_ϕθµ/ ])*)?\s*([,)\]])/g,
}
