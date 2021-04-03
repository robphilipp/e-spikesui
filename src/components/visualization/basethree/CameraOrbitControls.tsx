import {renderScenes, useThreeContext} from './useThree';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {Camera} from "three";
import {forwardRef, MutableRefObject, useEffect, useState} from "react";
import {UseThreeValues} from "./ThreeProvider";
import {Coordinate, coordinateFrom} from "./Coordinate";

/**
 * Properties defining the behavior of the orbit controls. Please see
 * [the ThreeJs docs](https://threejs.org/docs/index.html#examples/en/controls/OrbitControls) for information
 * on these properties.
 */
export interface OwnProps {
    enableDamping?: boolean;
    dampingFactor?: number;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    rotateSpeed?: number;
    maxPolarAngle?: number;
    maxAzimuthAngle?: number;
    minDistance?: number;
    maxDistance?: number;
    enableKeys?: boolean;
    zoomSpeed?: number;
    panSpeed?: number;
    target?: Coordinate;
}

const defaultProps = {
    enableDamping: false,
    dampingFactor: 0.8,
    autoRotate: false,
    autoRotateSpeed: 0.8,
    rotateSpeed: 0.8,
    maxPolarAngle: Math.PI,
    maxAzimuthAngle: Infinity,
    minDistance: 0,
    maxDistance: Infinity,
    enableKeys: false,
    zoomSpeed: 0.2,
    panSpeed: 1,
    target: coordinateFrom(0, 0, 0)
};

/**
 * The camera orbit-controls that allow moving around, zooming, panning, etc the scene
 * @param {OwnProps} props The properties
 * @param {MutableRefObject<OrbitControls>} ref The mutable reference to the OrbitControls object
 * @return {null} Always nothing, never something
 * @constructor
 */
function CameraOrbitControls(props: OwnProps, ref: MutableRefObject<OrbitControls>): null {
    const [controls, setControls] = useState<OrbitControls>();

    const {scenes} = useThreeContext()

    // set up the controls using the react context hook
    const context = useThreeContext((context: UseThreeValues): void => {
        const {camera, canvas} = context;
        const {
            enableDamping = defaultProps.enableDamping,
            dampingFactor = defaultProps.dampingFactor,
            autoRotate = defaultProps.autoRotate,
            autoRotateSpeed = defaultProps.autoRotateSpeed,
            rotateSpeed = defaultProps.rotateSpeed,
            maxPolarAngle = defaultProps.maxPolarAngle,
            maxAzimuthAngle = defaultProps.maxAzimuthAngle,
            minDistance = defaultProps.minDistance,
            maxDistance = defaultProps.maxDistance,
            enableKeys = defaultProps.enableKeys,
            zoomSpeed = defaultProps.zoomSpeed,
            panSpeed = defaultProps.panSpeed,
            target = defaultProps.target
        } = props;

        const controls = new OrbitControls(camera as Camera, canvas as HTMLElement);
        controls.target.set(target.x, target.y, target.z);

        controls.enableDamping = enableDamping;
        controls.dampingFactor = dampingFactor;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = autoRotateSpeed;
        controls.rotateSpeed = rotateSpeed;
        controls.maxPolarAngle = maxPolarAngle;
        controls.maxAzimuthAngle = maxAzimuthAngle;
        controls.minDistance = minDistance;
        controls.maxDistance = maxDistance;
        controls.enableKeys = enableKeys;
        controls.zoomSpeed = zoomSpeed;
        controls.panSpeed = panSpeed;

        controls.update();

        setControls(controls);

        ref.current = controls;
    });

    // adds a change listener for the controls so that when the controls are changed, the scene
    // can be rendered.
    useEffect(
        () => {
            if (controls) {
                controls.addEventListener(
                    'change',
                    () => renderScenes(context, () => controls.update())
                );
            }

            // teardown
            return () => {
                if(controls) {
                    controls.removeEventListener(
                        'change',
                        () => renderScenes(context,() => controls.update())
                    );
                }
            }
        },
        [controls]
    );

    return null;
}

export default forwardRef(CameraOrbitControls);
