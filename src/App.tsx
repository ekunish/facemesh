import React, { useEffect, useState } from "react";
import "./App.css";
import * as facemesh from "@tensorflow-models/facemesh";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
import * as bodyPix from "@tensorflow-models/body-pix";
import * as THREE from "three";
import { qProps, Sample } from "./components/Sample";
import { PersonInferenceConfig } from "@tensorflow-models/body-pix/dist/body_pix_model";
import { isContext } from "vm";

const App: React.FC = () => {
  const initQuaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(40, 0, 20),
    new THREE.Vector3(0, 20, 5)
  );

  const [q, setQ] = useState(initQuaternion);

  const main = async () => {
    console.log(initQuaternion);
    tf.setBackend("webgl");
    console.log(tf.getBackend());
    // Load the MediaPipe facemesh model assets.
    const model = await facemesh.load();
    const modelBody = await bodyPix.load();

    // Pass in a video stream to the model to obtain
    // an array of detected faces from the MediaPipe graph.
    const video = document.getElementById("player") as HTMLVideoElement;

    const output = document.getElementById("output") as HTMLCanvasElement;

    setInterval(async () => {
      const faces = await model.estimateFaces(video);

      const bodyPixOption = {
        flipHorizontal: false,
        internalResolution: "medium",
        segmentationThreshold: 0.7,
        maxDetections: 4,
        scoreThreshold: 0.5,
        nmsRadius: 20,
        minKeypointScore: 0.3,
        refineSteps: 10,
      } as PersonInferenceConfig;

      const bodies = await modelBody.segmentPerson(video, bodyPixOption);

      const ctx = output.getContext("2d");
      ctx?.clearRect(0, 0, output.width, output.height);
      ctx!.fillStyle = "#00f";

      let leftShoulder = { x: 0, y: 0 };
      let leftElbow = { x: 0, y: 0 };
      let leftWrist = { x: 0, y: 0 };

      let rightShoulder = { x: 0, y: 0 };
      let rightElbow = { x: 0, y: 0 };
      let rightWrist = { x: 0, y: 0 };

      bodies.allPoses.forEach((pose) => {
        const keypoints = pose.keypoints;
        keypoints.forEach((xy) => {
          if (xy.score > 0.5) {
            if (xy.part === "leftShoulder") leftShoulder = xy.position;
            if (xy.part === "leftElbow") leftElbow = xy.position;
            if (xy.part === "leftWrist") leftWrist = xy.position;

            if (xy.part === "rightShoulder") rightShoulder = xy.position;
            if (xy.part === "rightElbow") rightElbow = xy.position;
            if (xy.part === "rightWrist") rightWrist = xy.position;

            ctx?.beginPath();
            ctx?.arc(xy.position.x, xy.position.y, 4, 0, 2 * Math.PI);
            ctx?.fill();
          }
        });
        // console.log(pose);
      });

      // draw line for bodypix
      ctx!.lineWidth = 2;
      ctx!.strokeStyle = "#00f";

      if (leftShoulder.x !== 0 && rightShoulder.x !== 0) {
        ctx?.beginPath();
        ctx?.moveTo(leftShoulder.x, leftShoulder.y);
        ctx?.lineTo(rightShoulder.x, rightShoulder.y);
        ctx?.stroke();
      }

      if (leftShoulder.x !== 0 && leftElbow.x !== 0) {
        ctx?.beginPath();
        ctx?.moveTo(leftShoulder.x, leftShoulder.y);
        ctx?.lineTo(leftElbow.x, leftElbow.y);
        ctx?.stroke();
      }

      if (leftElbow.x !== 0 && leftWrist.x !== 0) {
        ctx?.beginPath();
        ctx?.moveTo(leftElbow.x, leftElbow.y);
        ctx?.lineTo(leftWrist.x, leftWrist.y);
        ctx?.stroke();
      }

      if (rightShoulder.x !== 0 && rightElbow.x !== 0) {
        ctx?.beginPath();
        ctx?.moveTo(rightShoulder.x, rightShoulder.y);
        ctx?.lineTo(rightElbow.x, rightElbow.y);
        ctx?.stroke();
      }

      if (rightElbow.x !== 0 && rightWrist.x !== 0) {
        ctx?.beginPath();
        ctx?.moveTo(rightElbow.x, rightElbow.y);
        ctx?.lineTo(rightWrist.x, rightWrist.y);
        ctx?.stroke();
      }

      // draw facemesh
      ctx!.fillStyle = "#f00";

      // Each face object contains a `scaledMesh` property,
      // which is an array of 468 landmarks.
      faces.forEach((face) => {
        const keypoints = face.scaledMesh as [];
        keypoints.forEach((xy) => {
          ctx?.beginPath();
          ctx?.arc(xy[0], xy[1], 1.2, 0, 2 * Math.PI);
          ctx?.fill();
        });

        facePose(keypoints);
      });
    }, 100);
  };

  const facePose = (keypoints: Array<Array<Number>>) => {
    const ax1 = keypoints[101] as Array<number>;
    const ax2 = keypoints[352] as Array<number>;
    const ay1 = keypoints[338] as Array<number>;
    const ay2 = keypoints[428] as Array<number>;

    const x1 = new THREE.Vector3().fromArray(ax1);
    const x2 = new THREE.Vector3().fromArray(ax2);
    const y1 = new THREE.Vector3().fromArray(ay1);
    const y2 = new THREE.Vector3().fromArray(ay2);

    const xaxis = x2.sub(x1).normalize();
    const yaxis = y2.sub(y1).normalize();
    const zaxis = new THREE.Vector3().crossVectors(xaxis, yaxis);

    const mat = new THREE.Matrix4()
      .makeBasis(xaxis, yaxis, zaxis)
      .premultiply(new THREE.Matrix4().makeRotationZ(Math.PI));

    const quaternion = new THREE.Quaternion().setFromRotationMatrix(
      mat
    ) as THREE.Quaternion;

    setQ(quaternion);

    /////////////////////////////// createbox //////////////////////////////

    // サイズを指定
    const width = 640;
    const height = 480;
    // レンダラを作成
    const renderer: any = new THREE.WebGLRenderer({
      canvas: document.getElementById("cube") as HTMLCanvasElement,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    // シーンを作成
    const scene = new THREE.Scene();
    // カメラを作成
    const camera = new THREE.PerspectiveCamera(45, width / height);
    camera.position.set(0, 0, -2000);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    // 箱を作成
    const geometry = new THREE.BoxGeometry(400, 400, 400);
    const material = new THREE.MeshNormalMaterial();
    const box = new THREE.Mesh(geometry, material);

    scene.add(box);
    box.rotation.setFromQuaternion(quaternion);
    // console.log(quaternion);
    renderer.render(scene, camera);
  };

  const setupCamera = async () => {
    var useDeviceId: string = "";
    // get devices
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        // 取得できたカメラとマイクを含むデバイスからカメラだけをフィルターする
        var videoSroucesArray = devices.filter(function (elem) {
          return elem.kind == "videoinput";
        });
        console.log(videoSroucesArray);

        // 成功時
        // console.log(devices);
        devices.forEach(function (device) {
          // デバイスごとの処理
          if (device.label === "FaceTime HDカメラ（内蔵） (05ac:8511)") {
            console.log(device.deviceId);
            useDeviceId = device.deviceId;
          }
        });
      })
      .catch(function (err) {
        // エラー発生時
        console.error("enumerateDevide ERROR:", err);
      });

    const constraints = {
      audio: false,
      video: {
        width: 640,
        height: 480,
        deviceId: useDeviceId,
      },
    };

    await navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        const player = document.getElementById("player") as HTMLVideoElement;
        player.srcObject = stream;
        player.onloadedmetadata = (e) => {
          player.play();
        };
      })
      .catch(function (err) {
        console.log(err.name + ": " + err.message);
      });
  };

  // main start ///////////////
  useEffect(() => {
    setupCamera().then(() => {
      const video = document.getElementById("player") as HTMLVideoElement;
      video.onloadeddata = (e) => {
        main();
      };
    });
  }, []);

  // end /////////////////////

  return (
    <div className="App">
      <div className="monitor">
        <video id="player" width="640px" height="480px"></video>
        <canvas id="output" width="640px" height="480px"></canvas>
      </div>
      <div className="aa">
        <canvas id="cube" width="640px" height="480px"></canvas>
        {/* <Sample quaternion={q} /> */}
      </div>
    </div>
  );
};

export default App;
