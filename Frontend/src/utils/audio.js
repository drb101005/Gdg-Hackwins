export function selectRecordingMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function selectVideoRecordingMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }

  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export async function convertBlobToWav(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error("Audio conversion is not supported in this browser.");
  }

  const audioContext = new AudioContextConstructor();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const wavBlob = audioBufferToWavBlob(audioBuffer);
    return {
      blob: wavBlob,
      silenceDetected: detectSilence(audioBuffer),
    };
  } finally {
    await audioContext.close();
  }
}

function detectSilence(audioBuffer) {
  const sampleCount = audioBuffer.length;
  if (!sampleCount) {
    return true;
  }

  let peak = 0;
  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
    const channel = audioBuffer.getChannelData(channelIndex);
    for (let index = 0; index < channel.length; index += 1) {
      const amplitude = Math.abs(channel[index]);
      if (amplitude > peak) {
        peak = amplitude;
      }
    }
  }

  return peak < 0.015;
}

function audioBufferToWavBlob(audioBuffer) {
  const channelData = [];
  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
    channelData.push(audioBuffer.getChannelData(channelIndex));
  }

  const interleaved = interleaveChannels(channelData, audioBuffer.length);
  const wavBuffer = encodeWav(interleaved, audioBuffer.sampleRate, channelData.length);
  return new Blob([wavBuffer], { type: "audio/wav" });
}

function interleaveChannels(channelData, length) {
  if (channelData.length <= 1) {
    return channelData[0] || new Float32Array(length);
  }

  const result = new Float32Array(length * channelData.length);
  let offset = 0;

  for (let index = 0; index < length; index += 1) {
    for (let channelIndex = 0; channelIndex < channelData.length; channelIndex += 1) {
      result[offset] = channelData[channelIndex][index];
      offset += 1;
    }
  }

  return result;
}

function encodeWav(samples, sampleRate, channelCount) {
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
