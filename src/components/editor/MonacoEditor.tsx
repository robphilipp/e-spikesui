/**
 * Rewritten from original code {@link https://github.com/react-monaco-editor/react-monaco-editor}
 */
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import {editor} from "monaco-editor/esm/vs/editor/editor.api";
import React, {useEffect, useRef} from "react";

const emptyFunction = () => {return;}

interface Props {
    // each editor in the app must have a unique ID
    editorId: string;
    // the editor window's width, which, if not specified, fills the parent's container width
    width?: number;
    // the editor window's height, which if not specified, defaults to 500 px
    height?: number;
    // the text in the editor
    value: string;
    // the default text in the editor
    defaultValue?: string;
    // the language of the text in the editor (i.e. typescript, rust, scala, javascript, etc)
    language?: string;
    // the editor theme name, which if not a standard theme, should be present in the
    // customThemes map. standard themes are 'vs', 'vs-dark', 'hc-black'. these can be used
    // as the base themes (see themes.ts for examples).
    // note: all the editor themes will be the same (a monaco restriction). so you may want to
    // set the themes to be the same for all the editors in your application
    theme: string;
    // a map holding custom theme names to custom themes
    customThemes?: Map<string, editor.IStandaloneThemeData>;
    options?: editor.IEditorOptions;
    // eslint-disable-next-line @typescript-eslint/ban-types
    overrideServices?: object;
    editorDidMount?: (editor: editor.IStandaloneCodeEditor, env: typeof monaco) => void;
    editorWillMount?: (env: typeof monaco) => editor.IStandaloneEditorConstructionOptions;
    onChange?: (value: string, event: editor.IModelContentChangedEvent) => void;
}

/**
 * React wrapper for the Monaco editor
 * @param {Props} props The props for the editor
 * @return {JSX.Element} The editor
 * @constructor
 */
export default function MonacoEditor(props: Props): JSX.Element {
    const {
        editorId,
        width = 100,
        height = 100,
        value,
        defaultValue = '',
        language = 'javascript',
        theme,
        customThemes = new Map(),
        options = {} as editor.IEditorOptions,
        overrideServices = {},
        editorDidMount = emptyFunction,
        editorWillMount = emptyFunction,
        onChange = emptyFunction
    } = props;

    const editorRef = useRef<editor.IStandaloneCodeEditor>();
    const containerElementRef = useRef<HTMLDivElement>();
    const subscriptionRef = useRef<monaco.IDisposable>();
    const preventTriggerChangeEventRef = useRef<boolean>();

    // when component mounts set up the monaco editor, and when component unmounts, then
    // tear down the editor. As part of the set-up, calculates the options
    useEffect(
        () => {
            const currentValue = value != null ? value : defaultValue;
            if (containerElementRef.current) {
                // before initializing monaco editor
                const updatedOptions = { ...props.options, ...(editorWillMount(monaco) || {}) };

                // create the editor
                editorRef.current = editor.create(
                    containerElementRef.current,
                    {
                        value: currentValue,
                        language,
                        ...updatedOptions,
                        ...(theme ? { theme } : {}),
                    },
                    overrideServices
                );

                // set the editor's dimensions
                editorRef.current.layout({width: width, height: height});

                // after initializing monaco editor
                handleEditorDidMount(editorRef.current);
            }

            return () => {
                if (editorRef.current) {
                    editorRef.current.dispose();
                    const model = editorRef.current.getModel();
                    if (model) {
                        model.dispose();
                    }
                }
                if (subscriptionRef.current) {
                    subscriptionRef.current.dispose();
                }
            }
        },
        // even though the linter complains, we really do only want to call this useEffect(..)
        // once when the component is mounted, and have the clean-up function called when the
        // component is unmounted, changes to the other dependent variables, such as value,
        // language, themes, options are handled in separate useEffect(..) functions below.
        []
    );

    // when the text in the editor changes, update the editor
    useEffect(
        () => {
            const model = editorRef.current?.getModel();
            if (value != null && model && value !== model.getValue() && editorRef.current) {
                preventTriggerChangeEventRef.current = true;
                editorRef.current.pushUndoStop();
                model.pushEditOperations(
                    [],
                    [{
                        range: model.getFullModelRange(),
                        text: value
                    }],
                    // todo what should this really be
                    () => []
                );
                editorRef.current.pushUndoStop();
                preventTriggerChangeEventRef.current = false;
            }
        },
        [value]
    )

    // when the language changes, update the editor's language
    useEffect(
        () => {
            const model = editorRef.current?.getModel();
            if (model) {
                editor.setModelLanguage(model, language)
            }
        },
        [language]
    )

    // when the custom themes change, update the themes defined in the editor
    useEffect(
        () => {
            customThemes.forEach((data, name) => editor.defineTheme(name, data));
        },
        [customThemes]
    )

    // when the theme changes, update the theme
    useEffect(
        () => {
            editor.setTheme(theme);
        },
        [theme]
    );

    // when the editor options change, updated the editor
    useEffect(
        () => {
            editorRef.current?.updateOptions(options);
        },
        [options]
    )

    // when the width and height of the editor change need to update the layout
    useEffect(
        () => {
            if (containerElementRef.current) {
                editorRef.current?.layout({width: width, height: height});
            }
        },
        [width, height]
    )

    /**
     * Adds the on-change function from the props so that it gets called when there is a change
     * to the text in the editor
     * @param {editor.IStandaloneCodeEditor} editor The editor that has just mounted
     */
    function handleEditorDidMount(editor: editor.IStandaloneCodeEditor): void {
        editorDidMount(editor, monaco);

        subscriptionRef.current = editor.onDidChangeModelContent((event) => {
            if (!preventTriggerChangeEventRef.current) {
                onChange(editor.getValue(), event);
            }
        });
    }

    return (
        <div
            id={editorId}
            ref={(component: HTMLDivElement) => containerElementRef.current = component}
            className="react-monaco-editor-container"
        />
    );
}
