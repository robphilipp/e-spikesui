import {Option} from "prelude-ts";
import {
    NETWORK_BUILT,
    NETWORK_DELETED,
    NETWORK_DESCRIPTION_CHANGED,
    NETWORK_EVENTS_OBSERVABLE_CREATE,
    SIMULATION_PAUSED,
    SIMULATION_STARTED,
    SIMULATION_STOPPED,
    WEBSOCKET_SUBJECT_CREATED,
    WEBSOCKET_SUBSCRIBED
} from "../actions/networkManagement";
import {ApplicationAction} from "../actions/actions"
import {TimeRange, timeRangeFrom} from "../../timeseries/TimeRange";
// import {TimeEvents} from "../../timeseries/TimeEvents";
import {TimeEvent, TimeSeries} from "../../timeseries/TimeSeries";
import {Observable, Subject, Subscription} from "rxjs";
import {Map, List} from "immutable";
import {WebSocketSubject} from "rxjs/internal-compatibility";
import {NetworkEvent} from "../actions/networkEvent";

const initialNetworkDescription = `// line sensor network
// For parameters that accept units, if they are not specified, they default to:
// • distances to µm
// • times to ms
// • conductance speeds to m/s
// • electric potentials to mV
// • frequencies to Hz
// • magnetic flux to Wb
// notes
// • wnm from 1e-3 to 0
// • ipl from 0.001 to 0.00 for output layer
// • mpn from 0.05 to 0.0
(
GRP=[
    (gid=group1)
    //(gid=group1, hst=localhost, prt=2553)
],
NRN=[
    // input layer
    (nid=in-1, grp=group1, nty=mi, mst=1 mV, inh=f, rfp=2 ms, rfb=0.1 µWb, mnp=0 mV, mpd=2500 ms, mpr=2 ms, mpn=0.0 mV, wnm=0, spp=1.1 mV, csp=0.1 m/s,
        ipb=0 mV, ipl=0 mV, ipd=3600 s,
        WDF=(fnc=zer),
        SRP=(fcb=1000, fcm=0.1, fct=100 ms, dpb=1000, dpm=0.1, dpt=100 ms),
        WLF=(fnc=bnd, lwb=0.0, upb=1.0),
        LOC=(cst=ct, px1=-300 µm, px2=0µm, px3=100 µm)
    ),
    (nid=in-2, grp=group1, nty=mi, mst=1 mV, inh=f, rfp=2 ms, rfb=0.1 µWb, mnp=0 mV, mpd=2500 ms, mpr=2 ms, mpn=0.0 mV, wnm=0, spp=1.1 mV, csp=0.1 m/s,
        ipb=0 mV, ipl=0 mV, ipd=3600 s,
        WDF=(fnc=zer),
        SRP=(fcb=1000, fcm=0.1, fct=100 ms, dpb=1000, dpm=0.1, dpt=100 ms),
        WLF=(fnc=bnd, lwb=0.0, upb=1.0),
        LOC=(cst=ct, px1=300 µm, px2=0 µm, px3=100 µm)
    ),

    // inhibition neuron
    (nid=inh-1, grp=group1, nty=mi, mst=0.4 mV, inh=t, rfp=0.1 ms, rfb=0.1 µWb, mnp=0 mV, mpd=250 ms, mpr=2 ms, mpn=0.0 mV, wnm=0, spp=0.5 mV, csp=0.08 m/s,
        ipb=0 mV, ipl=0 mV, ipd=3600 s,
        WDF=(fnc=exp, dhl=10 s),
        SRP=(fcb=1000, fcm=0, fct=100 ms, dpb=1000, dpm=0, dpt=100 ms),
        WLF=(fnc=bnd, lwb=0.0, upb=1.5),
        LOC=(cst=ct, px1=-290 µm, px2=0 µm, px3=0 µm)
    ),
    (nid=inh-2, grp=group1, nty=mi, mst=0.4 mV, inh=t, rfp=0.1 ms, rfb=0.1 µWb, mnp=0 mV, mpd=250 ms, mpr=2 ms, mpn=0.0 mV, wnm=0, spp=0.5 mV, csp=0.08 m/s,
        ipb=0 mV, ipl=0 mV, ipd=3600 s,
        WDF=(fnc=exp, dhl=10 s),
        SRP=(fcb=1000, fcm=0, fct=100 ms, dpb=1000, dpm=0, dpt=100 ms),
        WLF=(fnc=bnd, lwb=0.0, upb=1.5),
        LOC=(cst=ct, px1=290 µm, px2=0 µm, px3=0 µm)
    ),

    // output layer
    (nid=out-1, grp=group1, nty=mi, mst=1.0 mV, inh=f, rfp=20 ms, rfb=0.1 µWb, mnp=0 mV, mpd=2500 ms, mpr=2 ms, mpn=0.0 mV, wnm=1e-5, spp=1 mV, csp=1 m/s,
        ipb=0 mV, ipl=0 nV, ipd=3600 s,
        WDF=(fnc=zer),
        SRP=(fcb=1000, fcm=0.1, fct=100 ms, dpb=1000, dpm=10, dpt=100 ms),
        WLF=(fnc=bnd, lwb=0.0, upb=1.0),
        LOC=(cst=ct, px1=-300 µm, px2=0 µm, px3=0 µm)
    ),
    (nid=out-2, grp=group1, nty=mi, mst=1.0 mV, inh=f, rfp=20 ms, rfb=0.1 µWb, mnp=0 mV, mpd=2500 ms, mpr=2 ms, mpn=0.0 mV, wnm=1e-5, spp=1 mV, csp=1 m/s,
        ipb=0 mV, ipl=0 nV, ipd=3600 s,
        WDF=(fnc=zer),
        SRP=(fcb=1000, fcm=0.1, fct=100 ms, dpb=1000, dpm=10, dpt=100 ms),
        WLF=(fnc=bnd, lwb=0.0, upb=1.0),
        LOC=(cst=ct, px1=300 µm, px2=0 µm, px3=0 µm)
    )
],

CON=[
    // input to output
    (prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_alpha),
    //(prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_soft),
    //(prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_hard),

    // output to inhibition
    //(prn=out-1, psn=inh-1, cnw=1, eqw=1, lrn=stdp_hard),
    //(prn=out-2, psn=inh-2, cnw=1, eqw=1, lrn=stdp_hard),
    (prn=out-1, psn=inh-1, cnw=1, eqw=1, lrn=flat),
    (prn=out-2, psn=inh-2, cnw=1, eqw=1, lrn=flat),

    // inhib to output
    //(prn=inh-1, psn=out-2, cnw=1, eqw=1, lrn=stdp_hard),
    //(prn=inh-2, psn=out-1, cnw=1, eqw=1, lrn=stdp_hard)
    (prn=inh-1, psn=out-2, cnw=1, eqw=1, lrn=flat),
    (prn=inh-2, psn=out-1, cnw=1, eqw=1, lrn=flat)
],

LRN=[
    //(fnc=stdp_soft, ina=0.04, inp=30 ms, exa=0.02, exp=10 ms),
    (fnc=stdp_soft, ina=0.06, inp=15 ms, exa=0.02, exp=10 ms),
    //(fnc=stdp_hard, ina=0.06, inp=15 ms, exa=0.02, exp=10 ms),
    //(fnc=stdp_alpha, bln=-1, alr=0.02, atc=22 ms),
    //(fnc=stdp_alpha, bln=-1, alr=0.02, atc=22 ms),
    (fnc=stdp_alpha, bln=-1, alr=0.04, atc=22 ms),
    (fnc=flat)
]
)`;

interface NetworkManagementState {
    // // the network description
    // networkDescription: string;
    // the network ID
    networkId: Option<string>;

    // current simulation time
    time: number;
    // time-range of the plot
    timeRange: TimeRange;
    // map(neuron_id -> time_events) holds the times of the spikes as they come in from
    // the backend, and are periodically appended to the time-series
    // events: Map<string, TimeEvents>;
    events: Map<string, List<TimeEvent>>;
    // map(neuron_id -> timer_series) holds the time-series of the spikes
    timeSeries: Map<string, TimeSeries>;
    // whether or not the simulation is running
    running: boolean;
    // whether or not the front-end is paused, while continuing to buffer back-end events
    paused: boolean;
    // observable that receives messages
    // observable: Observable<string[]>;
    observable: Observable<NetworkEvent>;
    // the websocket connection that receives string messages
    websocketSubject?: WebSocketSubject<string>;
    // pause subject
    pauseSubject: Subject<boolean>;
    // subscription to the RXjs flow for plotting spike events
    subscription: Subscription;
    // subscription to the RXjs for pausing the plotting of spike events
    pauseSubscription: Subscription;
}

const initialNetworkState: NetworkManagementState = {
    // networkDescription: initialNetworkDescription,
    networkId: Option.none(),
    time: 0,
    // timeRange: new TimeRange(0, 5000),
    timeRange: timeRangeFrom(0, 5000),
    // events: Map<string, TimeEvents>(),
    events: Map<string, List<TimeEvent>>(),
    timeSeries: Map<string, TimeSeries>(),
    running: false,
    paused: false,
    observable: new Observable<NetworkEvent>(),
    // observable: new Observable<string[]>(),
    pauseSubject: new Subject<boolean>(),
    subscription: Subscription.EMPTY,
    pauseSubscription: Subscription.EMPTY
};

/**
 * The reducer that updates the application state based on the current state and the action
 * @param {NetworkManagementState} state The current network state
 * @param {ApplicationAction} action The network action
 * @return {NetworkManagementState} The updated network state
 */
export function networkManagementReducer(state = initialNetworkState, action: ApplicationAction): NetworkManagementState {
    switch (action.type) {
        // case NETWORK_DESCRIPTION_CHANGED:
        //     return {
        //         ...state,
        //         networkDescription: action.networkDescription
        //     };

        case NETWORK_BUILT:
            // only update the state if there are no errors
            return action.result
                .map((id: string) => ({
                    ...state,
                    networkId: Option.of(id)
                }))
                .getOrElse(state);

        case WEBSOCKET_SUBJECT_CREATED:
            return {
                ...state,
                websocketSubject: action.webSocketSubject
            };

        case NETWORK_EVENTS_OBSERVABLE_CREATE:
            return {
                ...state,
                observable: action.observable,
                pauseSubject: action.pauseSubject
            };

        case WEBSOCKET_SUBSCRIBED:
            return {
                ...state,
                time: action.time,
                timeRange: action.timeRange,
                events: action.events,
                timeSeries: action.timeSeries,
                subscription: action.subscription,
                pauseSubscription: action.pauseSubscription
            };

        case NETWORK_DELETED:
            // only update the state if there are no errors
            return action.result
                .map(() => ({
                    ...state,
                    networkId: Option.none<string>(),
                }))
                .getOrElse(state);

        case SIMULATION_STARTED:
            return {
                ...state,
                running: true
            };

        case SIMULATION_STOPPED:
            return {
                ...state,
                running: false
            };

        case SIMULATION_PAUSED:
            return {
                ...state,
                paused: action.paused
            };

        default:
            return state;
    }
}
