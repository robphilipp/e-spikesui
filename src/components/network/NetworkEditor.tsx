import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import MonacoEditor from "../editor/MonacoEditor";
import {defaultCustomThemes, DefaultTheme} from '../editor/themes';
import {SPIKES_LANGUAGE_ID} from '../language/spikes-language';
import {RouteComponentProps, withRouter} from "react-router-dom";
import {AppState} from "../redux/reducers/root";
import {ThunkDispatch} from "redux-thunk";
import {ApplicationAction, clearErrorMessages} from "../redux/actions/actions";
import {changeTheme, hideSettingsPanel, showSettingsPanel} from "../redux/actions/settings";
import { updateNetworkDescription } from '../redux/actions/networkDescription';
import {connect} from "react-redux";


const customThemes = defaultCustomThemes();
const editorOptions = {selectOnLineNumbers: true, scrollBeyondLastLine: false};
const emptyFunction = () => {
    return;
}

interface Dimension {
    height: number;
    width: number;
}

interface StateProps {
    networkDescription: string;
}

interface DispatchProps {
    onDescriptionChanged: (description: string) => void;
}

interface OwnProps  extends RouteComponentProps<any> {
    theme?: string;
    // networkDescription: string;
}

type Props = StateProps & DispatchProps & OwnProps;

/**
 * Wrapper for the monaco editor that manages resizing and theme updates
 * @param {Props} props The properties holding the current theme
 * @return {JSX.Element} The network editor
 * @constructor
 */
function NetworkEditor(props: Props): JSX.Element {
    const {
        theme = DefaultTheme.DARK,
        networkDescription,
        onDescriptionChanged
    } = props;

    const editorRef = useRef<HTMLDivElement>();
    const [dimension, setDimension] = useState<Dimension>({width: 50, height: 50});
    // const [networkDescription, setNetworkDescription] = useState<string>(initialNetworkDescription);

    // when component mounts, sets the initial dimension of the editor and registers to listen
    // to window resize events. when component unmounts, removes the window-resize event listener
    useEffect(
        () => {
            if (editorRef.current) {
                setDimension(editorDimensions());
            }

            // listen to resize events so that the editor width and height can be updated
            window.addEventListener('resize', () => handleWindowResize());

            return () => {
                // stop listening to resize events
                window.removeEventListener('resize', () => handleWindowResize());
            }
        },
        []
    )

    /**
     * calculates the editors dimensions based on the `<div>`'s width and height
     * @return {Dimension} The dimension of the editor
     */
    function editorDimensions(): Dimension {
        return {
            width: editorRef.current.offsetWidth,
            height: editorRef.current.clientHeight
        };
    }

    /**
     * updates the editor's width and height when the container's dimensions change
     */
    function handleWindowResize(): void {
        if (editorRef.current) {
            const nextDimension = editorDimensions()
            const minDiff = 2;
            if (Math.abs(nextDimension.height - dimension.height) > minDiff ||
                Math.abs(nextDimension.width - dimension.width) > minDiff) {
                setDimension(nextDimension);
            }
        }
    }

    return (
        <div
            ref={editorRef}
            // can't just set a fraction for the height because the parent height may not be
            // set...but if it is, then you can use that.
            style={{height: window.innerHeight * 0.9, width: '100%'}}
        >
            <MonacoEditor
                editorId='spikes-lang'
                width={dimension.width}
                height={dimension.height}
                language={SPIKES_LANGUAGE_ID}
                theme={theme}
                customThemes={customThemes}
                value={networkDescription}
                options={editorOptions}
                // onChange={(value: string) => setNetworkDescription(value)}
                onChange={(value: string) => onDescriptionChanged(value)}
                editorDidMount={emptyFunction}
            />
        </div>
    )
}

/**
 * Returns the editor's theme that is mapped to the application's theme
 * @param {string} name The name of the application's theme
 * @return {string} The name of the editor's theme
 */
export function editorThemeFrom(name: string): string {
    switch (name) {
        case 'default':
        case 'light':
            return DefaultTheme.LIGHT;

        case 'dark':
            return DefaultTheme.DARK;

        default:
            return DefaultTheme.LIGHT;
    }
}

/*
 |
 |    REACT-REDUX functions and code
 |    (see also redux/actions.ts for the action types)
 |
 */

/**
 * react-redux function that maps the application state to the props used by the `App` component.
 * @param state The updated application state
 * @param ownProps The current properties of the `App` component
 */
const mapStateToProps = (state: AppState, ownProps: OwnProps): StateProps => ({
    ...ownProps,
    networkDescription: state.networkDescription.description
});

/**
 * react-redux function that maps the event handlers to the dispatch functions. Note that in the
 * ThunkDispatch, I believe the first type is the state, the second type is the extra argument,
 * and the third type is, obviously, the action.
 * @param {ThunkDispatch} dispatch The redux dispatcher
 * @param {OwnProps} _ The component's own properties
 * @return {DispatchProps} The updated dispatch-properties holding the event handlers
 */
const mapDispatchToProps = (dispatch: ThunkDispatch<AppState, unknown, ApplicationAction>): DispatchProps => ({
    onDescriptionChanged: (description: string) => dispatch(updateNetworkDescription(description))
});

const connectedNetworkEditor = connect(mapStateToProps, mapDispatchToProps)(NetworkEditor)
export default withRouter(connectedNetworkEditor);

// export const initialNetworkDescription = `// line sensor network
// // For parameters that accept units, if they are not specified, they default to:
// // • distances to µm
// // • times to ms
// // • conductance speeds to m/s
// // • electric potentials to mV
// // • frequencies to Hz
// // • magnetic flux to Wb
// // notes
// // • wnm from 1e-3 to 0
// // • ipl from 0.001 to 0.00 for output layer
// // • mpn from 0.05 to 0.0
// (
// GRP=[
//     (gid=group1)
//     //(gid=group1, hst=localhost, prt=2553)
// ],
// NRN=[
//     // input layer
//     (nid=in-1, grp=group1, nty=mi, mst=1 mV, inh=f, rfp=2 ms, rfb=0.1 µWb, mnp=0 mV, mpd=2500 ms, mpr=2 ms, mpn=0.0 mV, wnm=0, spp=1.1 mV, csp=0.1 m/s,
//         ipb=0 mV, ipl=0 mV, ipd=3600 s,
//         WDF=(fnc=zer),
//         SRP=(fcb=1000, fcm=0.1, fct=100 ms, dpb=1000, dpm=0.1, dpt=100 ms),
//         WLF=(fnc=bnd, lwb=0.0, upb=1.0),
//         LOC=(cst=ct, px1=-300 µm, px2=0µm, px3=100 µm)
//     ),
//     (nid=in-2, grp=group1, nty=mi, mst=1 mV, inh=f, rfp=2 ms, rfb=0.1 µWb, mnp=0 mV, mpd=2500 ms, mpr=2 ms, mpn=0.0 mV, wnm=0, spp=1.1 mV, csp=0.1 m/s,
//         ipb=0 mV, ipl=0 mV, ipd=3600 s,
//         WDF=(fnc=zer),
//         SRP=(fcb=1000, fcm=0.1, fct=100 ms, dpb=1000, dpm=0.1, dpt=100 ms),
//         WLF=(fnc=bnd, lwb=0.0, upb=1.0),
//         LOC=(cst=ct, px1=300 µm, px2=0 µm, px3=100 µm)
//     ),
//
//     // inhibition neuron
//     (nid=inh-1, grp=group1, nty=mi, mst=0.4 mV, inh=t, rfp=0.1 ms, rfb=0.1 µWb, mnp=0 mV, mpd=250 ms, mpr=2 ms, mpn=0.0 mV, wnm=0, spp=0.5 mV, csp=0.08 m/s,
//         ipb=0 mV, ipl=0 mV, ipd=3600 s,
//         WDF=(fnc=exp, dhl=10 s),
//         SRP=(fcb=1000, fcm=0, fct=100 ms, dpb=1000, dpm=0, dpt=100 ms),
//         WLF=(fnc=bnd, lwb=0.0, upb=1.5),
//         LOC=(cst=ct, px1=-290 µm, px2=0 µm, px3=0 µm)
//     ),
//     (nid=inh-2, grp=group1, nty=mi, mst=0.4 mV, inh=t, rfp=0.1 ms, rfb=0.1 µWb, mnp=0 mV, mpd=250 ms, mpr=2 ms, mpn=0.0 mV, wnm=0, spp=0.5 mV, csp=0.08 m/s,
//         ipb=0 mV, ipl=0 mV, ipd=3600 s,
//         WDF=(fnc=exp, dhl=10 s),
//         SRP=(fcb=1000, fcm=0, fct=100 ms, dpb=1000, dpm=0, dpt=100 ms),
//         WLF=(fnc=bnd, lwb=0.0, upb=1.5),
//         LOC=(cst=ct, px1=290 µm, px2=0 µm, px3=0 µm)
//     ),
//
//     // output layer
//     (nid=out-1, grp=group1, nty=mi, mst=1.0 mV, inh=f, rfp=20 ms, rfb=0.1 µWb, mnp=0 mV, mpd=2500 ms, mpr=2 ms, mpn=0.0 mV, wnm=1e-5, spp=1 mV, csp=1 m/s,
//         ipb=0 mV, ipl=0 nV, ipd=3600 s,
//         WDF=(fnc=zer),
//         SRP=(fcb=1000, fcm=0.1, fct=100 ms, dpb=1000, dpm=10, dpt=100 ms),
//         WLF=(fnc=bnd, lwb=0.0, upb=1.0),
//         LOC=(cst=ct, px1=-300 µm, px2=0 µm, px3=0 µm)
//     ),
//     (nid=out-2, grp=group1, nty=mi, mst=1.0 mV, inh=f, rfp=20 ms, rfb=0.1 µWb, mnp=0 mV, mpd=2500 ms, mpr=2 ms, mpn=0.0 mV, wnm=1e-5, spp=1 mV, csp=1 m/s,
//         ipb=0 mV, ipl=0 nV, ipd=3600 s,
//         WDF=(fnc=zer),
//         SRP=(fcb=1000, fcm=0.1, fct=100 ms, dpb=1000, dpm=10, dpt=100 ms),
//         WLF=(fnc=bnd, lwb=0.0, upb=1.0),
//         LOC=(cst=ct, px1=300 µm, px2=0 µm, px3=0 µm)
//     )
// ],
//
// CON=[
//     // input to output
//     (prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_alpha),
//     //(prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_soft),
//     //(prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_hard),
//
//     // output to inhibition
//     //(prn=out-1, psn=inh-1, cnw=1, eqw=1, lrn=stdp_hard),
//     //(prn=out-2, psn=inh-2, cnw=1, eqw=1, lrn=stdp_hard),
//     (prn=out-1, psn=inh-1, cnw=1, eqw=1, lrn=flat),
//     (prn=out-2, psn=inh-2, cnw=1, eqw=1, lrn=flat),
//
//     // inhib to output
//     //(prn=inh-1, psn=out-2, cnw=1, eqw=1, lrn=stdp_hard),
//     //(prn=inh-2, psn=out-1, cnw=1, eqw=1, lrn=stdp_hard)
//     (prn=inh-1, psn=out-2, cnw=1, eqw=1, lrn=flat),
//     (prn=inh-2, psn=out-1, cnw=1, eqw=1, lrn=flat)
// ],
//
// LRN=[
//     //(fnc=stdp_soft, ina=0.04, inp=30 ms, exa=0.02, exp=10 ms),
//     (fnc=stdp_soft, ina=0.06, inp=15 ms, exa=0.02, exp=10 ms),
//     //(fnc=stdp_hard, ina=0.06, inp=15 ms, exa=0.02, exp=10 ms),
//     //(fnc=stdp_alpha, bln=-1, alr=0.02, atc=22 ms),
//     //(fnc=stdp_alpha, bln=-1, alr=0.02, atc=22 ms),
//     (fnc=stdp_alpha, bln=-1, alr=0.04, atc=22 ms),
//     (fnc=flat)
// ]
// )`;
