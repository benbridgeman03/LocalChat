import { useState, useEffect } from "react";
import { EventsOn } from "../wailsjs/runtime/runtime";
import { SendMessage } from "../wailsjs/go/backend/PeerService";

function App() {
  const [peers, setPeers] = useState([]);
  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

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

  useEffect(() => {
    const stop = EventsOn("chat:message", (from, msg) => {
      setMessages((prev) => [...prev, { from, msg }]);
    });

    return () => stop();
  }, []);

  const send = async () => {
    if (!activePeer || !input.trim()) return;

    await SendMessage(activePeer, input);

    setMessages((prev) => [...prev, { from: "me", msg: input }]);
    setInput("");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Discovered Peers</h1>

      {peers.length === 0 && <p>No peers online</p>}

      {peers.map((peer) => (
        <p
          key={peer}
          onClick={() => {
            setActivePeer(peer);
            setMessages([]);
          }}
          style={{ cursor: "pointer", color: "blue" }}
        >
          {peer}
        </p>
      ))}
      {activePeer && (
        <div
          style={{
            marginTop: 30,
            padding: 20,
            border: "1px solid #ccc",
            borderRadius: 8,
            width: 400,
          }}
        >
          <h2>Chat with {activePeer}</h2>

          <div
            style={{
              background: "#eee",
              padding: 10,
              height: 200,
              overflowY: "auto",
              marginBottom: 10,
            }}
          >
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <strong>{m.from}: </strong>
                {m.msg}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              style={{ flex: 1, padding: 8 }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
            />
            <button onClick={send}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
