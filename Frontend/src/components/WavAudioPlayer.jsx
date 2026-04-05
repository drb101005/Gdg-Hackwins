import React, { useState } from "react";
import { getMediaUrl } from "../services/api";

function WavAudioPlayer({ path, label = "Recording" }) {
  const [loadError, setLoadError] = useState(false);

  if (!path) {
    return <p className="hint-modern">No audio file available.</p>;
  }

  return (
    <div className="media-panel-modern">
      <p className="interview-label-modern">{label}</p>
      {loadError ? (
        <p className="hint-modern">Audio failed to load. Verify the local WAV file still exists.</p>
      ) : (
        <audio className="audio-player-modern" controls preload="metadata" onError={() => setLoadError(true)}>
          <source src={getMediaUrl(path)} type="audio/wav" />
        </audio>
      )}
    </div>
  );
}

export default WavAudioPlayer;
