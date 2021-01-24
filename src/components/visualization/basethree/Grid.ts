import {useThree} from './useThree';
import {
    BufferAttribute,
    BufferGeometry,
    Color, FaceColors,
    Float32BufferAttribute,
    LineBasicMaterial,
    LineSegments,
    VertexColors
} from "three";
import {useEffect, useState} from "react";
import {ThreeContext} from "./ThreeJsManager";

interface GridProps {
    sceneId: string;
    size?: number;
    divisions?: number;
    gridColor: Color;
    centerColor?: Color;
    opacity?: number;
}

/**
 * Grid plane. Code converted from [GridHelper.js](https://github.com/mrdoob/three.js/blob/master/src/helpers/GridHelper.js)
 * written by mrdoob.
 * @param {GridProps} props The grid properties
 * @return {null} Always nothing
 * @constructor
 */
function Grid(props: GridProps): null {
    const {
        size = 10000,
        divisions = 1000,
        gridColor,
        centerColor = gridColor,
        opacity = 1,
        sceneId
    } = props;

    const [colors, ] = useState(new Float32BufferAttribute(vertexColors(size, divisions), 3));
    const [vertices, ] = useState(new Float32BufferAttribute(vertexCoords(size, divisions), 3));

    /**
     * Calculates the vertices for the grid mesh
     * @param {number} size The number of the mesh
     * @param {number} divisions The number of divisions making up the grid
     * @return {Array<number>} The vertex locations as (x, y, z)-start to (x, y, z)-end
     */
    function vertexCoords(size: number, divisions: number): Array<number> {
        const step = size / divisions;
        const halfSize = size / 2;

        const vertices = [];
        for (let i = 0, k = -halfSize; i <= divisions; i++, k += step) {
            vertices.push(-halfSize, 0, k, halfSize, 0, k);
            vertices.push(k, 0, -halfSize, k, 0, halfSize);
        }
        return vertices;
    }

    /**
     * Calculates the colors for the line segment vertices
     * @param {number} size The number of the mesh
     * @param {number} divisions The number of divisions making up the grid
     * @return {Array<number>} The vertex colors (r, g, b)-start-start, (r, g, b)-start-end, (r, g, b)-end-start
     */
    function vertexColors(size: number, divisions: number): Array<number> {
        const center = divisions / 2;
        const step = size / divisions;
        const halfSize = size / 2;

        const colors: Array<number> = [];
        for (let i = 0, j = 0, k = -halfSize; i <= divisions; i++, k += step) {
            const color = i === center ? centerColor : gridColor;

            // copy the color into the color array, for each vertex (start, end)
            color.toArray(colors, j);
            j += 3;
            color.toArray(colors, j);
            j += 3;
            color.toArray(colors, j);
            j += 3;
            color.toArray(colors, j);
            j += 3;
        }
        return colors;
    }

    // sets up the grid as a bunch of line segments and grabs the line segments that
    // were just created or exist already
    const {getEntity} = useThree<LineSegments>((context: ThreeContext) => {
        const {scenesContext} = context;
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', vertices);
        geometry.setAttribute('color', colors);

        const material = new LineBasicMaterial({
            vertexColors: true,
            opacity: opacity,
            linewidth: 0.5,
            transparent: true
        });

        return scenesContext.addToScene(sceneId, new LineSegments(geometry, material));
    });

    // called when the axes colors change and need to be updated
    useEffect(
        () => {
            const bufferGeometry = getEntity().geometry as BufferGeometry;
            if(bufferGeometry) {
                colors.set(vertexColors(size, divisions));
                (bufferGeometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
            }
        },
        [centerColor, gridColor]
    );

    return null;
}

export default Grid;
