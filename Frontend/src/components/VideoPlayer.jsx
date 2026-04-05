import React, { useState } from "react";
import { getMediaUrl } from "../services/api";

function VideoPlayer({ path, label = "Video Recording" }) {
  const [loadError, setLoadError] = useState(false);

  if (!path) {
    return <p className="hint-modern">No video file available.</p>;
  }

  return (
    <div className="media-panel-modern">
      <p className="interview-label-modern">{label}</p>
      {loadError ? (
        <p className="hint-modern">Video failed to load. Verify the local video file still exists.</p>
      ) : (
        <video
          className="video-player-modern"
          controls
          preload="metadata"
          onError={() => setLoadError(true)}
          src={getMediaUrl(path)}
        />
      )}
    </div>
  );
}

export default VideoPlayer;
