/**
 * Strips the text of all comments, newlines (\n and/or \r), and all spaces so that it is one long-ass line.
 * This is done to make it easier to construct regex and parse them.
 * @param text The full text to strip
 * @return The text stripped of comments, newlines, and spaces.
 */
export function stripText(text: string): string {
    return text
        // remove any comments from the end
        .replace(/(\s*\/\/.*$)*/g, "")
        // remove all the comments
        .replace(/(\s*\/\/.*(\n\r|\n|\r)+\s*)*/g, "")
        // remove new-lines and spaces
        .replace(/\s*(\n\r|\n|\r)*\s*/g, "");
}

export const commentRegex = /(\n\r|\n|\r)*\s*\/\/.*(\n\r|\n|\r)+/;

export const newGrpRe = /GRP=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*\($/;
export const newNrnRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*\($/;
export const newConRe = /CON=\[[a-zA-Z0-9.\-_ϕθµ/(){},=]*\($/;
export const newLrnRe = /LRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*\($/;

export const newWdfRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*WDF=\($/;
export const newSrpRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*SRP=\($/;
export const newWlfRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*WLF=\($/;
export const newLocRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*LOC=\($/;

export const inWdfRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*WDF=\([a-zA-Z0-9.,=ϕθµ]*$/;
export const inSrpRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*SRP=\([a-zA-Z0-9.,=ϕθµ]*$/;
export const inWlfRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*WLF=\([a-zA-Z0-9.,=ϕθµ]*$/;
export const inLocRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*LOC=\([a-zA-Z0-9.,=ϕθµ-]*$/;

export const afterWdfRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*WDF=\([a-zA-Z0-9.,=ϕθµ]*\),?$/;
export const afterSrpRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*SRP=\([a-zA-Z0-9.,=ϕθµ]*\),?$/;
export const afterWlfRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*WLF=\([a-zA-Z0-9.,=ϕθµ]*\),?$/;
export const afterLocRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*LOC=\([a-zA-Z0-9.,=ϕθµ-]*\),?$/;

// in a current group, so cannot end with a ")" or "),"
export const inGrpRe = /GRP=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*\([a-zA-Z0-9.\-_ϕθµ/(),=]*(?<!(\),)|\))$/;
export const inNrnRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*\([a-zA-Z0-9.\-_ϕθµ/(),=]*(?<!(\),)|\))$/;
export const inConRe = /CON=\[[a-zA-Z0-9.\-_ϕθµ{}/(),=]*\([a-zA-Z0-9.\-_ϕθµ{}/(),=]*(?<!(\),)|\))$/;
export const inLrnRe = /LRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*\([a-zA-Z0-9.\-_ϕθµ/(),=]*(?<!(\),)|\))$/;

// in the GRP section, but not in a group, so must end with a "),"
export const inGrpsSecRe = /GRP=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*\([a-zA-Z0-9.\-_ϕθµ/(),=]*((\),)|\))$/;
export const inNrnsSecRe = /NRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*\([a-zA-Z0-9.\-_ϕθµ/(),=]*((\),)|\))$/;
export const inConsSecRe = /CON=\[[a-zA-Z0-9.\-_ϕθµ/{}(),=]*\([a-zA-Z0-9.\-_ϕθµ/{}(),=]*((\),)|\))$/;
export const inLrnsSecRe = /LRN=\[[a-zA-Z0-9.\-_ϕθµ/(),=]*\([a-zA-Z0-9.\-_ϕθµ/(),=]*((\),)|\))$/;

/**
 * Determines whether the cursor is in the NRN section but not in a neuron
 * @param text The text ending at the cursor
 * @return `true` if the cursor is in the neuron section and not in a neuron; `false` otherwise
 */
export function inNeuronSection(text: string): boolean {
    return notInNeuron(text) && text.match(inNrnsSecRe) !== null;
}

/**
 * Determines whether the cursor is not in a neuron or any of the neurons functions
 * @param text The text ending at the cursor
 * @return `true` if the cursor is not in a neuron; `false` otherwise
 */
export function notInNeuron(text: string): boolean {
    return text.match(afterWdfRe) === null &&
        text.match(afterSrpRe) === null &&
        text.match(afterWlfRe) === null &&
        text.match(afterLocRe) === null &&
        text.match(inNrnRe) === null
}

//
// regex for hovering
//

export const keyRe = /(,|\(|\[)[a-zA-Z0-9]+$/
export const valueRe = /[a-zA-Z0-9]{3}=[a-zA-Z0-9.\-_ϕθµ/{}]*$/;

export const keyBeforeCursorRe = /[a-zA-Z0-9]{1,3}$/;
export const keyAfterCursorRe = /^[a-zA-Z0-9]{1,3}(?==)/;
export const keyFromValueRe = /[a-zA-Z0-9]{3}=[a-zA-Z0-9.\-_ϕθµ/{}]*$/;

export function extractKeyFrom(matching: RegExpMatchArray | null): string {
    return matching ? matching[0].substring(0, 3) : '';
}