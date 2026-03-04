import { useState, useEffect, useRef } from "react";
import { EventsOn } from "../wailsjs/runtime/runtime";
import { SendMessage, GetPeers, AcceptFileOffer, DeclineFileOffer } from "../wailsjs/go/backend/PeerService";
import { normalizeId } from "./utils";
import { NetworkIcon } from "./components/Icons";
import TransferProgress from "./components/TransferProgress";
import FileRequestModal from "./components/FileRequestModal";
import PeerSidebar from "./components/PeerSidebar";
import ChatView from "./components/ChatView";

function App() {
  const [peers, setPeers] = useState([]);
  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState({});
  const [unread, setUnread] = useState({});
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [transferProgress, setTransferProgress] = useState(null);

  const activePeerRef = useRef(activePeer);

  useEffect(() => {
    activePeerRef.current = activePeer;
    if (activePeer && unread[activePeer]) {
      setUnread(prev => {
        const next = { ...prev };
        delete next[activePeer];
        return next;
      });
    }
  }, [activePeer, unread]);

  useEffect(() => {
    const addPeer = (peer) => {
      const cleanPeer = normalizeId(peer);
      setPeers((prev) => prev.includes(cleanPeer) ? prev : [...prev, cleanPeer]);
    };

    const removePeer = (peer) => {
      const cleanPeer = normalizeId(peer);
      setPeers((prev) => prev.filter((p) => p !== cleanPeer));
      setActivePeer((prev) => prev === cleanPeer ? null : prev);
    };

    const stopFound = EventsOn("peer:found", addPeer);
    const stopRemoved = EventsOn("peer:removed", removePeer);

    const stopOffer = EventsOn("file:offer", (offer) => {
      setIncomingOffer(offer);
    });

    const stopProgress = EventsOn("file:progress", (data) => {
      setTransferProgress(data);
      if (data.percentage >= 100) {
        setTimeout(() => setTransferProgress(null), 3000);
      }
    });

    GetPeers().then((existingPeers) => {
      if (existingPeers) existingPeers.forEach(addPeer);
    });

    return () => {
      stopFound();
      stopRemoved();
      stopOffer();
      stopProgress();
    };
  }, []);

  useEffect(() => {
    const stop = EventsOn("chat:message", (from, msg) => {
      const peerId = normalizeId(from);
      setMessages((prev) => ({
        ...prev,
        [peerId]: [...(prev[peerId] || []), { from, msg }]
      }));
      if (activePeerRef.current !== peerId) {
        setUnread(prev => ({ ...prev, [peerId]: true }));
      }
    });
    return () => stop();
  }, []);

  const handleSend = async (text) => {
    if (!activePeer) return;
    try {
      await SendMessage(activePeer, text);
      setMessages((prev) => ({
        ...prev,
        [activePeer]: [...(prev[activePeer] || []), { from: "me", msg: text }]
      }));
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleAcceptFile = async () => {
    await AcceptFileOffer(incomingOffer.sender, incomingOffer.filename, incomingOffer.size);
    setTransferProgress({ filename: incomingOffer.filename, percentage: 0, type: "download" });
    setIncomingOffer(null);
  };

  const handleRejectFile = async () => {
    await DeclineFileOffer(incomingOffer.sender, incomingOffer.filename);
    setIncomingOffer(null);
  };

  const currentMessages = activePeer ? (messages[activePeer] || []) : [];

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "'Segoe UI', sans-serif", backgroundColor: "#fff" }}>
      <TransferProgress data={transferProgress} onCancel={() => setTransferProgress(null)} />
      <FileRequestModal offer={incomingOffer} onAccept={handleAcceptFile} onReject={handleRejectFile} />

      <PeerSidebar peers={peers} activePeer={activePeer} unread={unread} onSelectPeer={setActivePeer} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#fff" }}>
        {activePeer ? (
          <ChatView peer={activePeer} messages={currentMessages} onSend={handleSend} />
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
            <NetworkIcon />
            <h3 style={{ marginTop: "24px", fontWeight: "600", color: "#374151" }}>No peer selected</h3>
            <p style={{ marginTop: "8px", fontSize: "0.95rem" }}>Select a neighbour from the left to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
