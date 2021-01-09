import {useThreeContext} from './useThree';
import {Camera} from "three";
// import {FlyControls} from "three/examples/jsm/controls/FlyControls";
// import {useState} from "react";
import {FirstPersonControls} from "three/examples/jsm/controls/FirstPersonControls";

function CameraFlyControls(): null {
    // const [prevTime, setPrevTime] = useState<number>(0);
    useThreeContext(({ camera, canvas }): void => {
        const controls = new FirstPersonControls(camera as Camera, canvas as HTMLElement);
        // controls.dragToLook = true;
        controls.movementSpeed = 10;
        // const delta = timer - prevTime;
        // setPrevTime(timer);
        controls.update(1);
    });

    return null;
}

export default CameraFlyControls;
