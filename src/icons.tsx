import React from "react";
import {registerIcons} from '@uifabric/styling';

// icons (fontawesome)
import {library} from '@fortawesome/fontawesome-svg-core'
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
    fas,
    faSave,
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
    faCheckCircle, faArrowDown, faArrowUp, faCheck, faCheckSquare
} from "@fortawesome/free-solid-svg-icons";

import {
    far,
    faCircle as farCircle,
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
            'upload': <FontAwesomeIcon icon={faFileUpload}/>,
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
            'cancel': <FontAwesomeIcon icon={faTimes}/>,
            'chevrondown': <FontAwesomeIcon icon={faChevronDown}/>,
            'completedsolid': <FontAwesomeIcon icon={faCheckCircle}/>,
            'sortdown': <FontAwesomeIcon icon={faArrowDown}/>,
            'sortup': <FontAwesomeIcon icon={faArrowUp}/>,
            'circlering': <FontAwesomeIcon icon={farCircle}/>,
            'statuscirclecheckmark': <FontAwesomeIcon icon={faCheck} size={"sm"}/>,
            'checkmark': <FontAwesomeIcon icon={faCheck} size={"sm"}/>,
            'regex': (<span><svg><text>(.*)</text></svg></span>)

        }
    });
}
