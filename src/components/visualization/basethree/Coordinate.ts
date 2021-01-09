interface BaseCoordinate {
    x: number;
    y: number;
    z: number;
}

export interface Coordinate extends BaseCoordinate {
    isEmpty: boolean;
    nonEmpty: boolean;
    equals: (coordinate: Coordinate) => boolean;
    toArray: () => Array<number>;
    plus: (coordinate: Coordinate) => Coordinate;
    minus: (coordinate: Coordinate) => Coordinate;
    scale: (factor: number) => Coordinate;
    magnitude: number;
}

/**
 * Represents cartesian coordinates for positions in the three-js scene
 */
export function coordinate(x: number, y: number, z: number): Coordinate {
    const isEmpty = isNaN(x) || isNaN(y) || isNaN(z);

    return {
        x: x,
        y: y,
        z: z,
        isEmpty: isEmpty,
        nonEmpty: !isEmpty,
        equals: (coordinate: Coordinate) => (x === coordinate.x && y === coordinate.y && z === coordinate.z),
        toArray: () => new Array<number>(x, y, z),
        plus: (coordinate: Coordinate) => addCoordinates({x, y, z}, coordinate),
        minus: (coordinate: Coordinate) => subtractCoordinates({x, y, z}, coordinate),
        scale: (factor: number) => scaleCoordinates({x, y, z}, factor),
        magnitude: Math.sqrt(x * x + y * y + z * z)
    }
}

export function coordinateFrom(x: number, y: number, z: number): Coordinate {
    return coordinate(x, y, z);
}

export function unitX(): Coordinate {
    return coordinate(1, 0, 0);
}

export function unitY(): Coordinate {
    return coordinate(0, 1, 0);
}

export function unitZ(): Coordinate {
    return coordinate(0, 0, 1);
}

export function origin(): Coordinate {
    return coordinate(0, 0, 0);
}

export function emptyCoordinate(): Coordinate {
    return coordinate(NaN, NaN, NaN);
}

export function minCoordinate(coordinate1: BaseCoordinate, coordinate2: BaseCoordinate): Coordinate {
    return coordinateFrom(
        Math.min(coordinate1.x, coordinate2.x),
        Math.min(coordinate1.y, coordinate2.y),
        Math.min(coordinate1.z, coordinate2.z)
    );
}

export function maxCoordinate(coordinate1: BaseCoordinate, coordinate2: BaseCoordinate): Coordinate {
    return coordinateFrom(
        Math.max(coordinate1.x, coordinate2.x),
        Math.max(coordinate1.y, coordinate2.y),
        Math.max(coordinate1.z, coordinate2.z)
    );
}

export function addCoordinates(coordinate1: BaseCoordinate, coordinate2: BaseCoordinate): Coordinate {
    return coordinateFrom(
        coordinate1.x + coordinate2.x,
        coordinate1.y + coordinate2.y,
        coordinate1.z + coordinate2.z
    );
}

export function scaleCoordinates(coordinate: BaseCoordinate, factor: number): Coordinate {
    return coordinateFrom(
        coordinate.x * factor,
        coordinate.y * factor,
        coordinate.z * factor
    );
}

export function subtractCoordinates(coordinate1: BaseCoordinate, coordinate2: BaseCoordinate): Coordinate {
    return coordinateFrom(
        coordinate1.x - coordinate2.x,
        coordinate1.y - coordinate2.y,
        coordinate1.z - coordinate2.z
    );
}

export function midpoint(coordinate1: BaseCoordinate, coordinate2: BaseCoordinate): Coordinate {
    return coordinateFrom(
        (coordinate1.x + coordinate2.x) / 2.0,
        (coordinate1.y + coordinate2.y) / 2.0,
        (coordinate1.z + coordinate2.z) / 2.0
    );
}
