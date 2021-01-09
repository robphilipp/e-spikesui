import {boundingBoxFrom, emptyBoundingBox,} from "./BoundingBox";
import {coordinateFrom, unitX, unitY, unitZ, origin} from "./Coordinate";

it('creating a bounding box from unit vectors', () => {
    const box = boundingBoxFrom([unitX(), unitY(), unitZ(), coordinateFrom(-1,-1,-1)]);
    const boxMin = coordinateFrom(-1, -1, -1);
    const boxMax = coordinateFrom(1, 1, 1);
    expect(box.min.equals(boxMin)).toBe(true);
    expect(box.max.equals(boxMax)).toBe(true);
    expect(box.center.equals(origin())).toBe(true);
});

it('emptiness', () => {
    expect(emptyBoundingBox().isEmpty()).toBeTruthy();
    expect(emptyBoundingBox().nonEmpty()).toBeFalsy();
    expect(boundingBoxFrom([unitX(), unitY(), unitZ()]).isEmpty()).toBeFalsy();
});