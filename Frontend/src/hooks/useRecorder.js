export function useRecorder() {
  let mediaRecorder;
  let chunks = [];

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
  }

  function stop() {
    return new Promise(resolve => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        chunks = [];
        resolve(blob);
      };
      mediaRecorder.stop();
    });
  }

  return { start, stop };
}
