import {boundSphereFrom} from "./BoundingSphere";
import {coordinateFrom, emptyCoordinate, origin} from "./Coordinate";
import {Vector} from "prelude-ts";

it('should create a bounding sphere for one coordinate with origin at coordinate and radius 0', () => {
    const c1 = coordinateFrom(1, 1, 1);
    const sphere = boundSphereFrom(Vector.of(c1));
    expect(sphere.origin.equals(c1)).toBe(true);
    expect(sphere.radius).toBe(0);
});

it('should create an empty bounding sphere for an empty coordinate', () => {
    let sphere = boundSphereFrom(Vector.of(emptyCoordinate()));
    expect(sphere.origin.equals(origin())).toBe(true);
    expect(sphere.radius).toBe(0);

    sphere = boundSphereFrom(Vector.empty());
    expect(sphere.origin.isEmpty).toBeTruthy();
    expect(sphere.radius).toBe(0);
});

it('should calculate the center of mass and radius', () => {
    const c1 = coordinateFrom(1, 1, 1);
    const c2 = c1.scale(-1);
    const sphere = boundSphereFrom(Vector.of(c1, c2));
    expect(sphere.origin.equals(origin())).toBe(true);
    expect(sphere.radius).toBeCloseTo(c1.magnitude);
});