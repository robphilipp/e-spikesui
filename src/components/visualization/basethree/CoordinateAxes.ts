import {ThreeContext} from "./ThreeJsManager";
import {BufferAttribute, BufferGeometry, Color, Float32BufferAttribute, LineBasicMaterial, LineSegments} from "three";
import {useThree} from "./useThree";
import {Coordinate, origin} from "./Coordinate";
import {useEffect, useState} from "react";

export interface AxesColors {
    x: Color;
    y: Color;
    z: Color;
}

/**
 * The coordinate axes properties
 */
export interface OwnProps {
    sceneId: string;
    // the length of the axes in pixels
    length: number;

    // the color of the x, y, and z axes
    color: AxesColors;

    // the location of the origin in the visualization; optional with
    // the origin (0, 0, 0) as the default value
    originOffset?: Coordinate;

    // the opacity of the axes
    opacity: number;
}

/**
 * Displays a set of coordinate axes whose (x, y, z)-colors, axes length, and axes opacity can be specified.
 * @param {OwnProps} props The axes properties
 * @return {null} A `null` JSX element
 * @constructor
 */
function CoordinateAxes(props: OwnProps): null {

    const {length, color, opacity, originOffset = origin(), sceneId} = props;

    const [colors, ] = useState(new Float32BufferAttribute(vertexColors(color), 3));
    const [vertices, ] = useState(new Float32BufferAttribute(vertexCoords(originOffset), 3));

    /**
     * Creates the vertex color array for the specified axes colors.
     * @param {AxesColors} color The colors for the x, y, and z, axes
     * @return {Array<number>} The vertex colors
     */
    function vertexColors(color: AxesColors): Array<number> {
        return [
            color.x.r, color.x.g, color.x.b,   color.x.r, color.x.g, color.x.b,
            color.y.r, color.y.g, color.y.b,   color.y.r, color.y.g, color.y.b,
            color.z.r, color.z.g, color.z.b,   color.z.r, color.z.g, color.z.b,
        ];
    }

    /**
     * Creates the vertex position array
     * @param offset The location of the axes origin relative to the true origin
     * @return The vertex locations
     */
    function vertexCoords(offset: Coordinate): Array<number> {
        return [
            offset.x, offset.y, offset.z,     length, offset.y, offset.z,
            offset.x, offset.y, offset.z,     offset.x, length, offset.z,
            offset.x, offset.y, offset.z,     offset.x, offset.y, length
        ]
    }

    // sets up the coordinate axes as line segments, adds them to the scene, holds on
    // to the line segments
    const {getEntity} = useThree<LineSegments>((context: ThreeContext) => {
        const {scenesContext} = context;
        const geometry = new BufferGeometry()
            .setAttribute('position', vertices)
            .setAttribute('color', colors);

        const material = new LineBasicMaterial({
            vertexColors: true,
            opacity: opacity,
        });

        return scenesContext.addToScene(sceneId, new LineSegments(geometry, material));
    });

    // called when the axes colors change and need to be updated
    useEffect(
        () => {
            const bufferGeometry = getEntity().geometry as BufferGeometry;
            if(bufferGeometry) {
                    colors.set(vertexColors(color));
                    (bufferGeometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
            }
        },
        [color]
    );

    return null;
}

export default CoordinateAxes;