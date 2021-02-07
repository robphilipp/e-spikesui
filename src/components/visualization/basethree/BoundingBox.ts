import {Coordinate, coordinateFrom, maxCoordinate, midpoint, minCoordinate} from "./Coordinate";

interface BoundingBox {
    isEmpty: () => boolean;
    nonEmpty: () => boolean;
    updated: (coordinate: Coordinate) => BoundingBox;
    width: number;
    height: number;
    min: Coordinate;
    max: Coordinate;
    center: Coordinate;
}

/**
 * Holds the (x, y, z) coordinates for the minimum and for the maximum opposing vertices of a box that
 * fully contain a set of coordinates.
 * @param {Coordinate} min The minimum coordinate of the bounding box
 * @param {Coordinate} max The maximum coordinate of the bounding box
 * @return {BoundingBox} A bounding box
 */
export function boundingBox(min: Coordinate, max: Coordinate): BoundingBox {

    /**
     * The bounding box is considered empty if it min coordinate is at (∞, ∞, ∞) and the max coordinate is
     * at (-∞, -∞, -∞). Or if the min and max coordinate are equal, which is a box of volume zero.
     * @return {boolean} `true` if the bounding box is empty; `false` otherwise.
     */
    function isEmpty(): boolean {
        return min.equals(max) || (
            min.equals(coordinateFrom(Infinity, Infinity, Infinity)) &&
            max.equals(coordinateFrom(-Infinity, -Infinity, -Infinity))
        );
    }

    /**
     * The bounding box is considered empty if it min coordinate is at (∞, ∞, ∞) and the max coordinate is
     * at (-∞, -∞, -∞). Or if the min and max coordinate are equal, which is a box of volume zero.
     * @return {boolean} `true` if the bounding box is NOT empty; `false` otherwise.
     */
    function nonEmpty(): boolean {
        return !isEmpty();
    }

    /**
     * Returns a copy of the bounding box after it has been updated to account for the specified coordiante
     * @param {Coordinate} coordinate The coordinate to account for in the bounding box
     * @return {BoundingBox} The updated bounding box
     */
    function updated(coordinate: Coordinate): BoundingBox {
        return boundingBox(
            minCoordinate(min, coordinate),
            maxCoordinate(max, coordinate)
        );
    }

    return {
        isEmpty,
        nonEmpty,
        updated,
        width: Math.abs(max.z - min.z),
        height: Math.abs(max.y - min.y),
        min: min,
        max: max,
        center: midpoint(min, max)
    }
}

/**
 * Constructs a bounding box of the specified set of coordinates
 * @param {Array<Coordinate>} coordinates The coordinates from which to construct a bounding box
 * @return {BoundingBox} The coordinates of a the opposing vertices of a box that contains all the
 * specified coordinates
 */
export function boundingBoxFrom(coordinates: Array<Coordinate>): BoundingBox {
    const min = coordinates.reduce(
        (c1, c2) => minCoordinate(c1, c2),
        coordinateFrom(Infinity, Infinity, Infinity)
    );
    const max = coordinates.reduce(
        (c1, c2) => maxCoordinate(c1, c2),
        coordinateFrom(-Infinity, -Infinity, -Infinity)
    );
    return boundingBox(min, max);
}

/**
 * @return {BoundingBox} An empty bounding box where the minimum coordinate is (∞, ∞, ∞) and the maximum
 * coordinate is (-∞, -∞, -∞). Updating an empty bounding box with any two unique coordinates will form
 * a non-empty bounding box.
 */
export function emptyBoundingBox(): BoundingBox {
    return boundingBox(
        coordinateFrom(Infinity, Infinity, Infinity),
        coordinateFrom(-Infinity, -Infinity, -Infinity)
    );
}
