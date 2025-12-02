import { useState, useEffect } from "react";
import { EventsOn } from "../wailsjs/runtime/runtime";

function App() {
  const [peers, setPeers] = useState([]);

  useEffect(() => {
    const addPeer = (peer) => {
      setPeers((prev) => {
        if (!prev.includes(peer)) return [...prev, peer];
        return prev;
      });
    };

    const removePeer = (peer) => {
      setPeers((prev) => prev.filter((p) => p !== peer));
    };

    const stopFound = EventsOn("peer:found", addPeer);
    const stopRemoved = EventsOn("peer:removed", removePeer);

    return () => {
      stopFound();
      stopRemoved();
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Discovered Peers</h1>
      {peers.length === 0 && <p>No peers online</p>}
    {peers.map((p, i) => (
        <p key={i}>{p}</p>
    ))}
    </div>
  );
}

export default App;
