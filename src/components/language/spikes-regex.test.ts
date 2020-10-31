import {
    commentRegex, extractKeyFrom,
    inConRe,
    inConsSecRe,
    inGrpRe,
    inLocRe, inLrnRe, inLrnsSecRe,
    inNeuronSection,
    inNrnRe,
    inNrnsSecRe,
    inSrpRe,
    inWdfRe,
    inWlfRe, keyFromValueRe, keyRe,
    newGrpRe,
    stripText, valueRe,
} from "./spikes-regex";

// import regexFrom from "./regex-combiner";
//
test('strip a comment', () => {
    expect(stripText(`// this is a comment
    `)).toEqual("");
});

test('text that ends in a comment should have that comment stripped', () => {
    let group = `// • wnm from 1e-3 to 0
// • ipl from 0.001 to 0.00 for output layer
// • mpn from 0.05 to 0.0
(
GRP=[
    (gid=group1)
    //(gid`;
    expect(stripText(group)).toEqual('(GRP=[(gid=group1)');
});

test('text is properly stripped of newlines, spaces and comments', () => {
    expect(stripText(`// this is a comment
    `)).toEqual("");
    const text = `// line sensor network
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
)`
    const expected = `(GRP=[(gid=group1)],NRN=[(nid=in-1,grp=group1,nty=mi,mst=1mV,inh=f,rfp=2ms,rfb=0.1µWb,mnp=0mV,mpd=2500ms,mpr=2ms,mpn=0.0mV,wnm=0,spp=1.1mV,csp=0.1m/s,ipb=0mV,ipl=0mV,ipd=3600s,WDF=(fnc=zer),SRP=(fcb=1000,fcm=0.1,fct=100ms,dpb=1000,dpm=0.1,dpt=100ms),WLF=(fnc=bnd,lwb=0.0,upb=1.0),LOC=(cst=ct,px1=-300µm,px2=0µm,px3=100µm)),(nid=in-2,grp=group1,nty=mi,mst=1mV,inh=f,rfp=2ms,rfb=0.1µWb,mnp=0mV,mpd=2500ms,mpr=2ms,mpn=0.0mV,wnm=0,spp=1.1mV,csp=0.1m/s,ipb=0mV,ipl=0mV,ipd=3600s,WDF=(fnc=zer),SRP=(fcb=1000,fcm=0.1,fct=100ms,dpb=1000,dpm=0.1,dpt=100ms),WLF=(fnc=bnd,lwb=0.0,upb=1.0),LOC=(cst=ct,px1=300µm,px2=0µm,px3=100µm)),(nid=inh-1,grp=group1,nty=mi,mst=0.4mV,inh=t,rfp=0.1ms,rfb=0.1µWb,mnp=0mV,mpd=250ms,mpr=2ms,mpn=0.0mV,wnm=0,spp=0.5mV,csp=0.08m/s,ipb=0mV,ipl=0mV,ipd=3600s,WDF=(fnc=exp,dhl=10s),SRP=(fcb=1000,fcm=0,fct=100ms,dpb=1000,dpm=0,dpt=100ms),WLF=(fnc=bnd,lwb=0.0,upb=1.5),LOC=(cst=ct,px1=-290µm,px2=0µm,px3=0µm)),(nid=inh-2,grp=group1,nty=mi,mst=0.4mV,inh=t,rfp=0.1ms,rfb=0.1µWb,mnp=0mV,mpd=250ms,mpr=2ms,mpn=0.0mV,wnm=0,spp=0.5mV,csp=0.08m/s,ipb=0mV,ipl=0mV,ipd=3600s,WDF=(fnc=exp,dhl=10s),SRP=(fcb=1000,fcm=0,fct=100ms,dpb=1000,dpm=0,dpt=100ms),WLF=(fnc=bnd,lwb=0.0,upb=1.5),LOC=(cst=ct,px1=290µm,px2=0µm,px3=0µm)),(nid=out-1,grp=group1,nty=mi,mst=1.0mV,inh=f,rfp=20ms,rfb=0.1µWb,mnp=0mV,mpd=2500ms,mpr=2ms,mpn=0.0mV,wnm=1e-5,spp=1mV,csp=1m/s,ipb=0mV,ipl=0nV,ipd=3600s,WDF=(fnc=zer),SRP=(fcb=1000,fcm=0.1,fct=100ms,dpb=1000,dpm=10,dpt=100ms),WLF=(fnc=bnd,lwb=0.0,upb=1.0),LOC=(cst=ct,px1=-300µm,px2=0µm,px3=0µm)),(nid=out-2,grp=group1,nty=mi,mst=1.0mV,inh=f,rfp=20ms,rfb=0.1µWb,mnp=0mV,mpd=2500ms,mpr=2ms,mpn=0.0mV,wnm=1e-5,spp=1mV,csp=1m/s,ipb=0mV,ipl=0nV,ipd=3600s,WDF=(fnc=zer),SRP=(fcb=1000,fcm=0.1,fct=100ms,dpb=1000,dpm=10,dpt=100ms),WLF=(fnc=bnd,lwb=0.0,upb=1.0),LOC=(cst=ct,px1=300µm,px2=0µm,px3=0µm))],CON=[(prn=in-{1,2},psn=out-{1,2},cnw=0.5,eqw=0.5,lrn=stdp_alpha),(prn=out-1,psn=inh-1,cnw=1,eqw=1,lrn=flat),(prn=out-2,psn=inh-2,cnw=1,eqw=1,lrn=flat),(prn=inh-1,psn=out-2,cnw=1,eqw=1,lrn=flat),(prn=inh-2,psn=out-1,cnw=1,eqw=1,lrn=flat)],LRN=[(fnc=stdp_soft,ina=0.06,inp=15ms,exa=0.02,exp=10ms),(fnc=stdp_alpha,bln=-1,alr=0.04,atc=22ms),(fnc=flat)])`
    expect(stripText(text)).toEqual(expected);
});

test('single line comment', () => {
   let text = `// this is a comment
   `;
   let result = text.match(commentRegex);
   expect(result).not.toBeNull();
});

test('multiline line comment', () => {
   let text = `
            // this is a comment with (property-like shit)•ππ
// and this is another line
   `;
   let result = text.match(commentRegex);
   expect(result).not.toBeNull();
});

test('comment must end in a new-line', () => {
    let text = `// this is a comment`;
    let result = text.match(commentRegex);
    expect(result).toBeNull();
});

//
// groups
//

test('new group regex requires an open paren in group section', () => {
    let group = `GRP = [
     // a comment
     (px1=-300 µm, fnc =  zer), (`;
    let result = stripText(group).match(newGrpRe);
    expect(result).not.toBeNull();
});

test('new group regex cannot be in an existing group', () => {
    let group = `GRP = [
     // a comment
     (px1=-300 µm, fnc =  zer), (x=`;
    let result = stripText(group).match(newGrpRe);
    expect(result).toBeNull();
});

test('in-group regex can be a new group', () => {
    let group = `GRP = [
     // a comment
     (px1=-300 µm, fnc =  zer), (`;
    let result = stripText(group).match(inGrpRe);
    expect(result).not.toBeNull();
});

test('in-group regex can be an existing group', () => {
    let group = `GRP = [
     // a comment
     (px1=-300 µm, fnc =  zer), (x =`;
    let result = stripText(group).match(inGrpRe);
    expect(result).not.toBeNull();
});

test('in-group regex can be an outside a group in the GRP section', () => {
    let group = `GRP = [
     // a comment
     (px1=-300 µm, fnc =  zer),`;
    let result = stripText(group).match(inGrpRe);
    expect(result).toBeNull();
});

//
// neuron tests
//
test('in-neuron regex must be in the neuron', () => {
    let neuron = `// • mpn from 0.05 to 0.0
(
GRP=[
    (gid=group1)
    //(gid=group1, hst=localhost, prt=2553)
],
NRN=[
    // input layer
    (nid=in-1, grp=group1, nty=mi, mst=1 mV, inh=f, rfp=2 ms, rfb=0.1 µWb, mnp=0 mV, mpd=2500 ms, mpr=2 ms, mpn=0.0 mV, wnm=0, spp=1.1 mV, csp=0.1 m/s,
        ipb=0 mV, ipl=0 mV, ipd=3600 s,`
    expect(stripText(neuron).match(inNrnRe)).not.toBeNull();
});

test('in-weight-decay-function regex must be in the WDF', () => {
    let neuron = `// • mpn from 0.05 to 0.0
(
GRP=[
    (gid=group1)
    //(gid=group1, hst=localhost, prt=2553)
],
NRN=[
    // input layer
    (nid=in-1, grp=group1, nty=mi, mst=1 mV, inh=f, rfp=2 ms, rfb=0.1 µWb, mnp=0 mV, mpd=2500 ms, mpr=2 ms, mpn=0.0 mV, wnm=0, spp=1.1 mV, csp=0.1 m/s,
        ipb=0 mV, ipl=0 mV, ipd=3600 s,
        SRP=(fcb=1000, fcm=0.1, fct=100 ms, dpb=1000, dpm=0.1, dpt=100 ms),
        WLF=(fnc=bnd, lwb=0.0, upb=1.0),
        LOC=(cst=ct, px1=-300 µm, px2=0µm, px3=100 µm),
        WDF=(fnc=zer`
    expect(stripText(neuron).match(inWdfRe)).not.toBeNull();
});

test('in-signal-release-probability regex must be in the SRP', () => {
    let neuron = `// • mpn from 0.05 to 0.0
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
        WLF=(fnc=bnd, lwb=0.0, upb=1.0),
        LOC=(cst=ct, px1=-300 µm, px2=0µm, px3=100 µm),
        SRP=(fcb=1000, fcm=0.1, fct=100 ms, dpb=1000, dpm=0.1, dpt=100 ms,`
    expect(stripText(neuron).match(inSrpRe)).not.toBeNull();
});

test('in-weight-limit-function regex must be in the WLF', () => {
    let neuron = `// • mpn from 0.05 to 0.0
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
        WLF=(fnc=bnd, lwb=0.0, `
    expect(stripText(neuron).match(inWlfRe)).not.toBeNull();
});

test('in-location regex must be in the LOC', () => {
    let neuron = `// • mpn from 0.05 to 0.0
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
        LOC=(cst=ct, px1=-300 µm, px2=0µm, px3`
    expect(stripText(neuron).match(inLocRe)).not.toBeNull();
});

test('in-neuron-section regex can be in the NRN section, but outside a neuron', () => {
    let neuron = `// • mpn from 0.05 to 0.0
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
    ),`
    expect(stripText(neuron).match(inNrnsSecRe)).not.toBeNull();
});

test('in-neuron-section regex cannot be in a neuron', () => {
    let neuron = `// • mpn from 0.05 to 0.0
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
        LOC=(cst=ct, px1=-300 µm, px2=0µm, px3=100 µm),`
    expect(inNeuronSection(stripText(neuron))).toBe(false);
});

//
// connections
//
test('in-connection must be in CON and in a connection', () => {
    let connection = `// • ipl from 0.001 to 0.00 for output layer
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
    )
],

CON=[
    // input to output
    (prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_alpha),
    //(prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_soft),
    //(prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_hard),

    // output to inhibition
    (prn=out-1, psn=inh-1, cnw=1, eqw=1,
`;
    expect(stripText(connection).match(inConRe)).not.toBeNull();
});

test('in-connection must be in CON', () => {
    let connection = `// • ipl from 0.001 to 0.00 for output layer
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
        LOC=(cst=ct, px1=300 µm, px2=0 µm, px3=100 µm`;
    expect(stripText(connection).match(inConRe)).toBeNull();
});

test('in-connection must be in CON but cannot be outside of a connection', () => {
    let connection = `// • ipl from 0.001 to 0.00 for output layer
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
    )
],

CON=[
    // input to output
    (prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_alpha),
    //(prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_soft),
    //(prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_hard),

    // output to inhibition
    //(prn=out-1, psn=inh-1, cnw=1, eqw=1,
`;
    expect(stripText(connection).match(inConRe)).toBeNull();
});

test('in-connection-section must be in CON and outside of a connection', () => {
    let connection = `// • ipl from 0.001 to 0.00 for output layer
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
    (prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_alpha),`;
    expect(stripText(connection).match(inConsSecRe)).not.toBeNull();
});

test('in-connection-section must be in CON and cannot be in a connection', () => {
    let connection = `// • ipl from 0.001 to 0.00 for output layer
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
    )
],

CON=[
    // input to output
    (prn=in-{1,2}, psn=out-{1,2}, cnw=0.5, eqw=0.5, lrn=stdp_alpha`;
    expect(stripText(connection).match(inConsSecRe)).toBeNull();
});

//
// learning
//
test('in-learn must be in LRN and in a learning function', () => {
    let learn = `// • ipl from 0.001 to 0.00 for output layer
// • mpn from 0.05 to 0.0
(
LRN=[
    //(fnc=stdp_soft, ina=0.04, inp=30 ms, exa=0.02, exp=10 ms),
    (fnc=stdp_soft, ina=0.06, inp=15 ms, exa=0.02, exp=10 ms`;
    expect(stripText(learn).match(inLrnRe)).not.toBeNull();
});

test('in-learn must be in LRN and cannot be outside a learning function', () => {
    let learn = `// • ipl from 0.001 to 0.00 for output layer
// • mpn from 0.05 to 0.0
(
LRN=[
    //(fnc=stdp_soft, ina=0.04, inp=30 ms, exa=0.02, exp=10 ms),
    (fnc=stdp_soft, ina=0.06, inp=15 ms, exa=0.02, exp=10 ms)`;
    expect(stripText(learn).match(inLrnRe)).toBeNull();
});

test('in-learn-sec must be in LRN and must be outside of a learning function', () => {
    let learn = `// • ipl from 0.001 to 0.00 for output layer
// • mpn from 0.05 to 0.0
(
LRN=[
    //(fnc=stdp_soft, ina=0.04, inp=30 ms, exa=0.02, exp=10 ms),
    (fnc=stdp_soft, ina=0.06, inp=15 ms, exa=0.02, exp=10 ms),`;
    expect(stripText(learn).match(inLrnsSecRe)).not.toBeNull();
});

test('in-learn-sec must be in LRN and cannot be in a learning function', () => {
    let learn = `// • ipl from 0.001 to 0.00 for output layer
// • mpn from 0.05 to 0.0
(
LRN=[
    //(fnc=stdp_soft, ina=0.04, inp=30 ms, exa=0.02, exp=10 ms),
    (fnc=stdp_soft, ina=0.06, inp=15 ms, exa=0.02, exp=10 ms`;
    expect(stripText(learn).match(inLrnsSecRe)).toBeNull();
});

//
// hovering
//
test('cursor on key should be able to identify being on a key', () => {
    let learn = `// • ipl from 0.001 to 0.00 for output layer
// • mpn from 0.05 to 0.0
(
LRN=[
    //(fnc=stdp_soft, ina=0.04, inp=30 ms, exa=0.02, exp=10 ms),
    (fnc=stdp_soft, ina=0.06, inp=15 ms, ex`;
    expect(stripText(learn).match(keyRe)).not.toBeNull();

    learn = `// • ipl from 0.001 to 0.00 for output layer
// • mpn from 0.05 to 0.0
(
LRN`;
    expect(stripText(learn).match(keyRe)).not.toBeNull();

    learn = `// • ipl from 0.001 to 0.00 for output layer
// • mpn from 0.05 to 0.0
(
LRN=[
    (fnc`;
    expect(stripText(learn).match(keyRe)).not.toBeNull();
});

test('cursor not on a key should not match key regex', () => {
    let neuron = `// • wnm from 1e-3 to 0
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
        LOC=(cst=ct, px1=-300 µm, px2=0µm, px3=100 µ`;
    expect(stripText(neuron).match(keyRe)).toBeNull();

    let group = `// • wnm from 1e-3 to 0
// • ipl from 0.001 to 0.00 for output layer
// • mpn from 0.05 to 0.0
(
GRP=[
    (gid=group1)
    //(gid`;
    expect(stripText(group).match(keyRe)).toBeNull();
});

test('cursor on value should match value', () => {
    let neuron = `// • wnm from 1e-3 to 0
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
        LOC=(cst=ct, px1=-300 µm, px2=0µm, px3=100 µ`;
    expect(stripText(neuron).match(valueRe)).not.toBeNull();
});

test('cursor not on value should not match value', () => {
    let neuron = `// • wnm from 1e-3 to 0
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
        LOC=(cst=ct, px1=-300 µm, px2=0µm, px3`;
    expect(stripText(neuron).match(valueRe)).toBeNull();
});

test('should be able to extract key from partial key', () => {
    let group = '    (gid=group';
});

test('should be able to extract key from value', () => {
    let group = '    (gid=group';
    expect(extractKeyFrom(stripText(group).match(keyFromValueRe))).toEqual('gid')
})