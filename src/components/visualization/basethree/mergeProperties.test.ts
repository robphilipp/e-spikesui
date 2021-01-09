import {mergeProperties} from "./mergeProperties";

it('should be able to merge to objects of same type overwriting fields with same name', () => {
    interface Test {
        propA: number;
        propB: string;
        propC?: number[];
        propD?: boolean;
    }

    const test1: Test = {
        propA: 3.14159,
        propB: 'π',
        propC: [3, 1, 4, 1, 5, 9],
    };
    const test2: Test = {
        propA: 2.71828,
        propB: 'e',
        propD: false
    };
    expect(mergeProperties(test1, test2)).toEqual({
        propA: test2.propA,
        propB: test2.propB,
        propC: test1.propC,
        propD: test2.propD
    });
});

it('should be able to merge objects of different type', () => {
    const test1 = {
        a: 'test1-a',
        b: 'test1-b',
        c: [1,1,1,1],
        d: true
    };
    const test2 = {
        d: 'overwriting test1-d',
        e: [2,2,2,2,2],
        f: 'test2-f'
    };
    expect(mergeProperties(test1, test2)).toEqual({
        a: test1.a,
        b: test1.b,
        c: test1.c,
        d: test2.d,
        e: test2.e,
        f: test2.f
    })
});