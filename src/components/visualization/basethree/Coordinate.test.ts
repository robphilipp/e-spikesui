import {
    addCoordinates,
    coordinateFrom,
    emptyCoordinate, maxCoordinate, midpoint, minCoordinate,
    origin,
    scaleCoordinates,
    subtractCoordinates
} from "./Coordinate";

it('origin and empty', () => {
    expect(origin().equals(coordinateFrom(0, 0, 0))).toBe(true);
    expect(origin().nonEmpty).toBeTruthy();
    expect(emptyCoordinate().isEmpty).toBeTruthy();
    expect(coordinateFrom(1, 2, 3).nonEmpty).toBeTruthy();
});

it('coordinate equality', () => {
    expect(coordinateFrom(1, 2, 3).equals(coordinateFrom(1, 2, 3))).toBeTruthy();
    expect(coordinateFrom(1, 2, 3).equals(coordinateFrom(1, 0, 3))).toBeFalsy();
});

it('adding coordinates', () => {
    const c1 = coordinateFrom(1, 1, 1);
    const c2 = coordinateFrom(2, 3, 4);
    expect(addCoordinates(c1, c2).equals(coordinateFrom(3, 4, 5))).toBe(true);

    const c0 = origin();
    expect(addCoordinates(c1, c0).equals(c1)).toBe(true);
    expect(addCoordinates(c2, c0).equals(c2)).toBe(true);
});

it('subtracting coordinates', () => {
    const c1 = coordinateFrom(1, 1, 1);
    expect(subtractCoordinates(c1, c1).equals(origin())).toBe(true);

    const c2 = coordinateFrom(2, 3, 4);
    expect(subtractCoordinates(c2, c1).equals(coordinateFrom(1, 2, 3))).toBe(true);
});

it('scaling coordinates', () => {
    expect(scaleCoordinates(origin(), 100).equals(origin())).toBe(true);
    expect(scaleCoordinates(coordinateFrom(1, 1, 1), 10).equals(coordinateFrom(10, 10, 10))).toBe(true);
    expect(scaleCoordinates(coordinateFrom(1, 1, 1), 0.5).equals(coordinateFrom(0.5, 0.5, 0.5))).toBe(true);
});

it('midpoint between coordinates', () => {
    const c1 = coordinateFrom(1, 1, 1);
    expect(midpoint(c1, c1.scale(-1)).equals(origin())).toBe(true);
    expect(midpoint(origin(), c1.scale(10)).equals(c1.scale(5))).toBe(true);

    const c2 = coordinateFrom(-1, 1, 1);
    expect(midpoint(c1, c2).equals(coordinateFrom(0, 1, 1))).toBe(true);
});

it('min and max', () => {
    expect(minCoordinate(coordinateFrom(10, -10, 10), coordinateFrom(-10, 10, -10)).equals(coordinateFrom(-10, -10, -10))).toBe(true);
    expect(maxCoordinate(coordinateFrom(10, -10, 10), coordinateFrom(-10, 10, -10)).equals(coordinateFrom(10, 10, 10))).toBe(true);
});

it('member methods', () => {
    const c1 = coordinateFrom(1, 2, 3);
    expect(c1.x).toBe(1);
    expect(c1.y).toBe(2);
    expect(c1.z).toBe(3);

    expect(c1.nonEmpty).toBeTruthy();
    expect(c1.isEmpty).toBeFalsy();
    expect(c1.equals(c1)).toBeTruthy();
    expect(c1.equals(coordinateFrom(3, 2, 1))).toBeFalsy();

    expect(c1.plus(origin()).equals(c1)).toBe(true);
    expect(c1.minus(origin()).equals(c1)).toBe(true);
    expect(c1.scale(1).equals(c1)).toBe(true);

    const c2 = coordinateFrom(2, 4, 6);
    expect(c1.plus(c1).equals(c2)).toBe(true);
    expect(c1.scale(2).equals(c2)).toBe(true);
    expect(c2.minus(c1).equals(c1)).toBe(true);

    expect(c1.toArray()).toEqual([1, 2, 3]);
});