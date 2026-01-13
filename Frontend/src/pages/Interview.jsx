const videoRef = useRef(null);
let tracker;

useEffect(() => {
  tracker = new FaceTracker(videoRef.current);
  tracker.start();

  return () => tracker.stop();
}, []);
