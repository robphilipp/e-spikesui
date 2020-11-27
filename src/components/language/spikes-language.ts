import {languages} from "monaco-editor/esm/vs/editor/editor.api";
import {spikesTokens} from "./spikes-tokens";
import {spikesLanguage} from "./spikes-language-config";
import {spikesCompletions} from "./spikes-completions";
import {spikesHovers} from "./spikes-hover";

export const SPIKES_LANGUAGE_ID = 'spikes-lang';

/**
 * Registers the spikes language with the monaco editor
 */
export function registerSpikesLanguage(): void {
    languages.register({id: SPIKES_LANGUAGE_ID});
    languages.registerCompletionItemProvider(SPIKES_LANGUAGE_ID, spikesCompletions);
    languages.registerHoverProvider(SPIKES_LANGUAGE_ID, spikesHovers);
    languages.setLanguageConfiguration(SPIKES_LANGUAGE_ID, spikesLanguage);
    languages.setMonarchTokensProvider(SPIKES_LANGUAGE_ID, spikesTokens);
}