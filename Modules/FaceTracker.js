import { FaceDetection } from "@mediapipe/face_detection";
import { Camera } from "@mediapipe/camera_utils";
import { FACE_TRACK_INTERVAL } from "./faceTrackerConfig";

class FaceTracker {
  constructor(videoElement) {
    this.video = videoElement;

    this.facePresentTime = 0;
    this.faceAbsentTime = 0;
    this.lastCheck = Date.now();
    this.faceDetected = false;

    this.faceDetection = new FaceDetection({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });

    this.faceDetection.setOptions({
      model: "short",
      minDetectionConfidence: 0.5,
    });

    this.faceDetection.onResults(this.handleResults.bind(this));
  }

  handleResults(results) {
    const now = Date.now();
    const diff = (now - this.lastCheck) / 1000;

    if (this.faceDetected) {
      this.facePresentTime += diff;
    } else {
      this.faceAbsentTime += diff;
    }

    this.faceDetected = results.detections.length > 0;
    this.lastCheck = now;
  }

  start() {
    this.camera = new Camera(this.video, {
      onFrame: async () => {
        await this.faceDetection.send({ image: this.video });
      },
      width: 640,
      height: 480,
    });

    this.camera.start();
  }

  stop() {
    this.camera.stop();
  }

  getStats() {
    return {
      facePresentTime: Math.round(this.facePresentTime),
      faceAbsentTime: Math.round(this.faceAbsentTime),
      totalTime:
        Math.round(this.facePresentTime + this.faceAbsentTime),
    };
  }
}

export default FaceTracker;
