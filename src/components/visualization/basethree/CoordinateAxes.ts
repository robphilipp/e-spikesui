import {UseThreeValues} from "./ThreeProvider";
import {
    BufferAttribute,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    LineBasicMaterial,
    LineSegments, Points, PointsMaterial, Texture,
    TextureLoader
} from "three";
import {useThree} from "./useThree";
import {Coordinate, origin} from "./Coordinate";
import {useEffect, useRef} from "react";
import {useScenes} from "./useScenes";

export interface AxesColors {
    x: Color;
    y: Color;
    z: Color;
}

const x = new TextureLoader().load('/resources/x.png');
const y = new TextureLoader().load('/resources/y.png');
const z = new TextureLoader().load('/resources/z.png');

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
 * @param props The axes properties
 * @return A `null` JSX element
 * @constructor
 */
function CoordinateAxes(props: OwnProps): null {

    const {length, color, opacity, originOffset = origin(), sceneId} = props;

    const colorsRef = useRef(new Float32BufferAttribute(vertexColors(color), 3));
    const verticesRef = useRef(new Float32BufferAttribute(vertexCoords(originOffset), 3));

    const pointsRef = useRef<Array<Points>>();
    const axesGeometryRef = useRef<Array<BufferGeometry>>([
        new BufferGeometry(), new BufferGeometry(), new BufferGeometry()
    ]);

    /**
     * Creates the vertex color array for the specified axes colors.
     * @param color The colors for the x, y, and z, axes
     * @return The vertex colors
     */
    function vertexColors(color: AxesColors): Array<number> {
        return [
            color.x.r, color.x.g, color.x.b, color.x.r, color.x.g, color.x.b,
            color.y.r, color.y.g, color.y.b, color.y.r, color.y.g, color.y.b,
            color.z.r, color.z.g, color.z.b, color.z.r, color.z.g, color.z.b,
        ];
    }

    /**
     * Creates the vertex position array
     * @param offset The location of the axes origin relative to the true origin
     * @return The vertex locations
     */
    function vertexCoords(offset: Coordinate): Array<number> {
        return [
            offset.x, offset.y, offset.z, length, offset.y, offset.z,
            offset.x, offset.y, offset.z, offset.x, length, offset.z,
            offset.x, offset.y, offset.z, offset.x, offset.y, length
        ]
    }

    function axesLabel(offset: Coordinate, axis: number): Array<number> {
        switch (axis) {
            // x
            case 0: return [length + 10, offset.y, offset.z];
            // y
            case 1: return [offset.x, length + 10, offset.z];
            // z
            case 2: return [offset.x, offset.y, length + 10];
        }
    }

    function axesColor(color: AxesColors): Array<number> {
        return [
            color.x.r, color.x.g, color.x.b, color.x.r, color.x.g, color.x.b,
        ];
    }

    function pointsMaterial(letter: Texture): PointsMaterial {
        return new PointsMaterial({
            vertexColors: true,
            size: 20,
            transparent: true,
            sizeAttenuation: true,
            alphaTest: 0.5,
            map: letter,
        });
    }

    // called when the neurons or the color ranges change so that we can recalculate the colors
    useEffect(
        () => {
            axesGeometryRef.current.forEach((geometry, axis) => {
                axesGeometryRef.current[axis].setAttribute(
                    'color',
                    new Float32BufferAttribute(axesColor(color), 3)
                );
                axesGeometryRef.current[axis].setDrawRange(0, 1);
                axesGeometryRef.current[axis].setAttribute(
                    'position',
                    new Float32BufferAttribute(axesLabel(originOffset || origin(), axis), 3)
                );
            })

            pointsRef.current = [
                new Points(axesGeometryRef.current[0], pointsMaterial(x)),
                new Points(axesGeometryRef.current[1], pointsMaterial(y)),
                new Points(axesGeometryRef.current[2], pointsMaterial(z)),
            ];
        },
        [color]
    );


    const scenesContext = useScenes();
    // sets up the coordinate axes as line segments, adds them to the scene, holds on
    // to the line segments
    const {getEntity} = useThree<LineSegments>(scenesContext, (context: UseThreeValues) => {
        // const {scenesContext} = context;

        const geometry = new BufferGeometry()
            .setAttribute('position', verticesRef.current)
            .setAttribute('color', colorsRef.current);

        const material = new LineBasicMaterial({
            vertexColors: true,
            opacity: opacity,
        });

        return scenesContext.addToScene(sceneId, new LineSegments(geometry, material));
    });

    // called when this component is mounted to create the neurons (geometry, material, and mesh) and
    // adds them to the network scene
    useThree<Array<Points>>(scenesContext, (context: UseThreeValues): [scenedId: string, points: Array<Points>] => {
        // contextRef.current = context;
        // return context.scenesContext.addToScene(sceneId, pointsRef.current);
        // const points = pointsRef.current.map(point => context.scenesContext.addToScene(sceneId, point)[1]);
        const points = pointsRef.current.map(point => scenesContext.addToScene(sceneId, point)[1]);
        return [sceneId, points];
    });

    // called when the axes colors change and need to be updated
    useEffect(
        () => {
            const bufferGeometry = getEntity().geometry as BufferGeometry;
            if (bufferGeometry) {
                colorsRef.current.set(vertexColors(color));
                (bufferGeometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
            }
        },
        [color]
    );

    return null;
}

export default CoordinateAxes;