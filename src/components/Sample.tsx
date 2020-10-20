import React, { useEffect } from "react";
import * as THREE from "three";
import { Quaternion } from "three";

export interface qProps {
  quaternion: Quaternion;
}

export const Sample: React.FC<qProps> = (props) => {
  /** case1 */
  const createBox = () => {
    // サイズを指定
    const width = 640;
    const height = 480;
    // レンダラを作成
    const renderer: any = new THREE.WebGLRenderer({
      canvas: document.querySelector("#nyumon-sample1") as HTMLCanvasElement,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    // シーンを作成
    const scene = new THREE.Scene();
    // カメラを作成
    const camera = new THREE.PerspectiveCamera(45, width / height);
    camera.position.set(0, 0, +1000);
    // 箱を作成
    const geometry = new THREE.BoxGeometry(400, 400, 400);
    const material = new THREE.MeshNormalMaterial();
    const box = new THREE.Mesh(geometry, material);
    scene.add(box);
    tick();
    // 毎フレーム時に実行されるループイベント
    function tick() {
      box.rotation.setFromQuaternion(props.quaternion);
      // box.rotation.y += 0.01;

      console.log(box.quaternion);
      renderer.render(scene, camera);
      // レンダリング
      requestAnimationFrame(tick);
    }
  };
  // didMountで描画しないと、Cannot read property 'width' of nullというエラーが出る
  useEffect(() => {
    createBox();
  }, []);
  return (
    <>
      <canvas id="nyumon-sample1" />
    </>
  );
};
