import React from "react";
import {registerIcons} from '@uifabric/styling';

// icons (fontawesome)
import {library} from '@fortawesome/fontawesome-svg-core'
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
    fas,
    faSave,
    faFile as faFileSolid,
    faFileUpload,
    faTrash,
    faProjectDiagram,
    faPlay,
    faStop,
    faPause,
    faRunning,
    faCog,
    faCogs,
    faPlus,
    faTimes,
    faChevronDown,
    faCheckCircle,
    faArrowDown,
    faArrowUp,
    faCheck,
    faCheckSquare,
    faExclamationCircle,
    faWaveSquare,
    faBrain,
    faCode,
    faMinusCircle,
    faChevronUp,
    faSyncAlt,
    faFileContract,
    faCopy, faCameraRetro, faGlasses, faEye, faEyeSlash, faHammer,
} from "@fortawesome/free-solid-svg-icons";

import {
    far,
    faCircle as farCircle, faTimesCircle, faQuestionCircle, faFile, faEdit
} from '@fortawesome/free-regular-svg-icons'
import {mergeStyles} from "@fluentui/react";

export const iconControlsClass = mergeStyles({
    fontSize: 50,
    height: 50,
    width: 50,
    margin: '0 25px',
});

/**
 * sets up the icons so that we're not using microsoft copyrighted icons
 */
export default function prepareIcons(): void {

    library.add(fas);
    library.add(far);

    // register all the icons used in the application
    registerIcons({
        icons: {
            'check-square': <FontAwesomeIcon icon={faCheckSquare}/>,
            'save': <FontAwesomeIcon icon={faSave}/>,
            'save-as': <FontAwesomeIcon icon={faCopy}/>,
            'upload': <FontAwesomeIcon icon={faFileUpload}/>,
            'open-simulation': <FontAwesomeIcon icon={faFileContract}/>,
            'file': <FontAwesomeIcon icon={faFile}/>,
            'file-solid': <FontAwesomeIcon icon={faFileSolid}/>,
            'edit': <FontAwesomeIcon icon={faEdit}/>,
            'delete': <FontAwesomeIcon icon={faTrash}/>,
            'homegroup': <FontAwesomeIcon icon={faProjectDiagram}/>,
            'play': <FontAwesomeIcon icon={faPlay}/>,
            'stop': <FontAwesomeIcon icon={faStop}/>,
            'pause': <FontAwesomeIcon icon={faPause}/>,
            'sprint': <FontAwesomeIcon icon={faRunning}/>,
            'opensource': <FontAwesomeIcon icon={faCogs} style={{fontWeight: 200}}/>,
            'settings': <FontAwesomeIcon icon={faCog}/>,
            'add': <FontAwesomeIcon icon={faPlus}/>,
            'statuserrorfull': <FontAwesomeIcon icon={faTimes}/>,
            'close': <FontAwesomeIcon icon={faTimes}/>,
            'crossCircle': <FontAwesomeIcon icon={faTimesCircle}/>,
            'minusCircle': <FontAwesomeIcon icon={faMinusCircle}/>,
            'cancel': <FontAwesomeIcon icon={faTimes}/>,
            'chevrondown': <FontAwesomeIcon icon={faChevronDown}/>,
            'chevronup': <FontAwesomeIcon icon={faChevronUp}/>,
            'completedsolid': <FontAwesomeIcon icon={faCheckCircle}/>,
            'sortdown': <FontAwesomeIcon icon={faArrowDown}/>,
            'sortup': <FontAwesomeIcon icon={faArrowUp}/>,
            'circlering': <FontAwesomeIcon icon={farCircle}/>,
            'statuscirclecheckmark': <FontAwesomeIcon icon={faCheck} size={"sm"}/>,
            'checkmark': <FontAwesomeIcon icon={faCheck} size={"sm"}/>,
            'regex': (<span><svg><text>(.*)</text></svg></span>),
            'clear': <FontAwesomeIcon icon={faTimes}/>,
            'errorbadge': <FontAwesomeIcon icon={faExclamationCircle}/>,
            'environment': <FontAwesomeIcon icon={faWaveSquare}/>,
            'brain': <FontAwesomeIcon icon={faBrain}/>,
            'help': <FontAwesomeIcon icon={faQuestionCircle}/>,
            'code': <FontAwesomeIcon icon={faCode}/>,
            'reset': <FontAwesomeIcon icon={faSyncAlt}/>,
            'camera': <FontAwesomeIcon icon={faCameraRetro}/>,
            'glasses': <FontAwesomeIcon icon={faGlasses}/>,
            'eye': <FontAwesomeIcon icon={faEye}/>,
            'noEye': <FontAwesomeIcon icon={faEyeSlash}/>,
            'build': <FontAwesomeIcon icon={faHammer}/>,
        }
    });
}
