import {addCoordinates, Coordinate, origin} from "./Coordinate";
import {Vector} from "prelude-ts";

export interface BoundingSphere {
    origin: Coordinate;
    radius: number;
}

/**
 * Calculates the origin and radius of a sphere that contains all the specified coordinates. The
 * center is the center-of-mass of all the coordinates, and the radius is the max distance from the
 * center of any of the coordinates.
 * @param {Coordinate} origin The center of mass of the specified coordinates (as the origin)
 * @param {number} radius The distance from the center of mass (origin) to the most distant coordinate
 * @return {BoundingSphere} A sphere that bounds all the specified coordinates.
 */
export function boundingSphere(origin: Coordinate, radius: number): BoundingSphere {
    return {origin, radius};
}

/**
 * Calculates a bounding sphere for the specified coordinates. The bounding sphere is centered
 * on the center of mass of the coordinates, and the radius of the sphere is the largest displacement
 * from the center to any of the coordinates.
 * @param {Array<Coordinate>} coordinates The coordinates for which to calculate a bounding sphere
 * @return {BoundingSphere} A sphere that bounds all the specified coordinates.
 */
export function boundSphereFrom(coordinates: Vector<Coordinate>): BoundingSphere {
    // calculate the coordinate of the center of mass
    const center = coordinates
        .filter(coordinate => coordinate.nonEmpty)
        .fold(
            origin(),
            (c1, c2) => addCoordinates(c1, c2)
        )
        .scale(1.0 / coordinates.length());

    // calculate the maximum displacement from the center of mass
    const radius = coordinates
        .filter(coordinate => coordinate.nonEmpty)
        .map(coord => coord.minus(center).magnitude)
        .fold(0, (m1, m2) => Math.max(m1, m2));

    return boundingSphere(center, radius);
}
