import { useState, useEffect, useRef } from "react";
import { EventsOn } from "../wailsjs/runtime/runtime";
import { SendMessage, GetPeers, AcceptFileOffer, DeclineFileOffer, SelectAndSendFile } from "../wailsjs/go/backend/PeerService";


const PlusIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ComputerIcon = ({ color, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const NetworkIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e0e0e0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const FileRequestModal = ({ offer, onAccept, onReject }) => {
  if (!offer) return null;

  const formatSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div style={{
        backgroundColor: "white", padding: "20px", borderRadius: "8px", width: "320px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)", fontFamily: "'Segoe UI', sans-serif"
      }}>
        <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#333" }}>Incoming File</h3>
        <p style={{marginBottom: "15px", color: "#555"}}>
          <strong>{offer.sender}</strong> wants to send you a file.
        </p>
        
        <div style={{ 
          padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "6px", 
          marginBottom: "20px", border: "1px solid #eee", display: "flex", alignItems: "center", gap: "12px"
        }}>
           <div style={{ fontSize: "24px" }}>📄</div>
           <div>
              <div style={{ fontWeight: "600", color: "#333", wordBreak: "break-all" }}>{offer.filename}</div>
              <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "4px" }}>{formatSize(offer.size)}</div>
           </div>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button 
            onClick={onReject}
            style={{ padding: "8px 16px", border: "1px solid #ddd", background: "white", borderRadius: "4px", cursor: "pointer", fontSize: "0.9rem" }}
          >
            Reject
          </button>
          <button 
            onClick={onAccept}
            style={{ padding: "8px 16px", border: "none", background: "#1890ff", color: "white", borderRadius: "4px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600" }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

const normalizeId = (addr) => {
  if (!addr) return "";
  const lastColon = addr.lastIndexOf(":");
  if (lastColon === -1) return `${addr}:4001`;
  let ip = addr.substring(0, lastColon);
  if (ip.startsWith("[") && ip.endsWith("]")) {
    ip = ip.substring(1, ip.length - 1);
  }
  return `${ip}:4001`;
};

function App() {
  const [peers, setPeers] = useState([]);
  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState({});
  const [unread, setUnread] = useState({});
  const [input, setInput] = useState("");
  const [incomingOffer, setIncomingOffer] = useState(null);
  const messagesEndRef = useRef(null);
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
      setPeers((prev) => {
        if (!prev.includes(cleanPeer)) return [...prev, cleanPeer];
        return prev;
      });
    };

    const removePeer = (peer) => {
      const cleanPeer = normalizeId(peer);
      setPeers((prev) => prev.filter((p) => p !== cleanPeer));
      if (activePeer === cleanPeer) setActivePeer(null);
    };

    const stopFound = EventsOn("peer:found", addPeer);
    const stopRemoved = EventsOn("peer:removed", removePeer);

    const stopOffer = EventsOn("file:offer", (offer) => {
       console.log("File Offer Received:", offer);
       setIncomingOffer(offer);
    });

    GetPeers().then((existingPeers) => {
      if (existingPeers) existingPeers.forEach((peer) => addPeer(peer));
    });

    return () => {
      stopFound();
      stopRemoved();
      stopOffer();
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activePeer]);

  const send = async () => {
    if (!activePeer || !input.trim()) return;
    try {
      await SendMessage(activePeer, input);
      setMessages((prev) => ({
        ...prev,
        [activePeer]: [...(prev[activePeer] || []), { from: "me", msg: input }]
      }));
      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleAcceptFile = async () => {
      console.log("Accepted file:", incomingOffer.filename);

      await AcceptFileOffer(incomingOffer.sender, incomingOffer.filename);

      setIncomingOffer(null);
  };

  const handleRejectFile = async () => {
     console.log("Rejected file");

     await DeclineFileOffer(incomingOffer.sender, incomingOffer.filename);

     setIncomingOffer(null);
  };

  const formatAddress = (addr) => addr.split(":")[0];
  const currentMessages = activePeer ? (messages[activePeer] || []) : [];

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "'Segoe UI', sans-serif" }}>
      
      <FileRequestModal 
        offer={incomingOffer} 
        onAccept={handleAcceptFile} 
        onReject={handleRejectFile} 
      />

      <div style={{ width: "280px", backgroundColor: "#f5f7fa", borderRight: "1px solid #e0e0e0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #e0e0e0", backgroundColor: "#fff" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#333" }}>Network Neighbors</h2>
          <span style={{ fontSize: "0.8rem", color: "#888" }}>{peers.length} found</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {peers.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#999", fontSize: "0.9rem" }}>Scanning...</div>
          ) : (
            peers.map((peer) => {
              const isActive = activePeer === peer;
              const isUnread = !!unread[peer];

              return (
                <div
                  key={peer}
                  onClick={() => setActivePeer(peer)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px", padding: "12px 15px", marginBottom: "8px", borderRadius: "8px", cursor: "pointer",
                    backgroundColor: isActive ? "#e6f7ff" : "transparent",
                    border: isActive ? "1px solid #bce3ff" : "1px solid transparent",
                    transition: "all 0.2s",
                    position: "relative"
                  }}
                >
                  <div style={{ padding: "8px", backgroundColor: isActive ? "#1890ff" : "#fff", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                    <ComputerIcon color={isActive ? "#fff" : "#666"} size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#333" }}>{formatAddress(peer)}</div>
                    <div style={{ fontSize: "0.75rem", color: isActive ? "#1890ff" : "#999" }}>{isActive ? "Active Chat" : "Online"}</div>
                  </div>
                  
                  {isUnread && (
                    <div style={{ width: "10px", height: "10px", backgroundColor: "#1890ff", borderRadius: "50%", boxShadow: "0 0 0 2px #f5f7fa" }}></div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#fff" }}>
        {activePeer ? (
          <>
            <div style={{ padding: "15px 25px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", zIndex: 10 }}>
               <div style={{ width: "10px", height: "10px", background: "#52c41a", borderRadius: "50%" }}></div>
               <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{formatAddress(activePeer)}</h3>
            </div>

            <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#fafafa" }}>
              {currentMessages.length === 0 && (
                 <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#ccc" }}>
                    <p>Start a conversation with {formatAddress(activePeer)}</p>
                 </div>
              )}
              
              {currentMessages.map((m, i) => {
                const isMe = m.from === "me";
                return (
                  <div key={i} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "65%" }}>
                    {!isMe && <div style={{ fontSize: "0.7rem", color: "#999", marginLeft: "5px", marginBottom: "2px" }}>{formatAddress(m.from)}</div>}
                    <div style={{
                      padding: "10px 16px", borderRadius: "18px",
                      borderTopLeftRadius: isMe ? "18px" : "4px", borderTopRightRadius: isMe ? "4px" : "18px",
                      backgroundColor: isMe ? "#1890ff" : "#fff", color: isMe ? "#fff" : "#333",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)", lineHeight: "1.4", border: isMe ? "none" : "1px solid #e8e8e8"
                    }}>
                      {m.msg}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: "20px", borderTop: "1px solid #e0e0e0", backgroundColor: "#fff" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => SelectAndSendFile(activePeer)} style={{ display: "flex", alignItems: "center", justifyContent: "center",width: "42px", height: "42px", backgroundColor: "#f0f2f5", border: "none", borderRadius: "50%", cursor: "pointer", marginRight: "8px", color: "#555", flexShrink: 0 }}title="Send File"><PlusIcon size={20} /> </button>
                <input style={{ flex: 1, padding: "12px 16px", borderRadius: "24px", border: "1px solid #ddd", outline: "none", fontSize: "0.95rem", backgroundColor: "#f5f7fa" }}
                  value={input} onKeyDown={(e) => e.key === "Enter" && send()} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." />
                <button onClick={send} style={{ padding: "0 24px", backgroundColor: "#1890ff", color: "white", border: "none", borderRadius: "24px", cursor: "pointer", fontWeight: "600", transition: "background 0.2s" }}>Send</button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#aaa" }}>
            <NetworkIcon />
            <h3 style={{ marginTop: "20px", fontWeight: "normal" }}>Select a peer to start chatting</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;