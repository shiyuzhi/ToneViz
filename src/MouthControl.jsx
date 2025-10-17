// MouthControl.jsx
import React, { useEffect, useRef } from "react";
import * as Tone from "tone";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default function MouthControl({ synthsRef, currentInstrument }) {
  const videoRef = useRef();

  useEffect(() => {
    const video = videoRef.current;
    const synth = synthsRef.current?.[currentInstrument];

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks?.[0]) return;

      const lm = results.multiFaceLandmarks[0];
      const upperLip = lm[13]; // 上唇
      const lowerLip = lm[14]; // 下唇
      const mouthOpen = Math.max(0, lowerLip.y - upperLip.y); // 0~1 相對值

      if (mouthOpen > 0.05) {
        synth.triggerAttack("C4");
      } else {
        synth.triggerRelease("C4");
      }
    });

    const camera = new Camera(video, { onFrame: async () => await faceMesh.send({ image: video }) });
    camera.start();

    return () => camera.stop();
  }, [synthsRef, currentInstrument]);

  return <video ref={videoRef} autoPlay style={{ width: "100%", maxWidth: 600, borderRadius: 8 }} />;

}

