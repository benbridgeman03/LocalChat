import { useState, useEffect, useRef } from "react";
import { EventsOn } from "../wailsjs/runtime/runtime";
import { SendMessage, GetPeers, AcceptFileOffer, DeclineFileOffer, SelectAndSendFile, SelectAndSendFolder } from "../wailsjs/go/backend/PeerService";

const PlusIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FileIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
    <polyline points="13 2 13 9 20 9"></polyline>
  </svg>
);

const FolderIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
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

const UserAvatar = ({ size = 40, primaryColor = "#1890ff", secondaryColor = "#e6f7ff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
     <rect width="24" height="24" rx="8" fill={secondaryColor}/>
     <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill={primaryColor}/>
  </svg>
);

const TransferProgress = ({ data, onCancel }) => {
  if (!data) return null;
  const isComplete = data.percentage >= 100;
  
  return (
    <div style={{
      position: "fixed", bottom: "24px", left: "24px", width: "320px",
      backgroundColor: "white", padding: "20px", borderRadius: "16px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.15)", zIndex: 2000,
      fontFamily: "'Segoe UI', sans-serif", border: "1px solid rgba(0,0,0,0.05)",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
          <div style={{ 
            width: "32px", height: "32px", borderRadius: "10px", 
            backgroundColor: data.type === 'upload' ? "#e6f7ff" : "#f6ffed",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0
          }}>
            <span style={{ fontSize: "16px" }}>{data.type === 'upload' ? '⬆️' : '⬇️'}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
             <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
               {data.type === 'upload' ? 'Sending File' : 'Receiving File'}
             </span>
             <span style={{ fontSize: "0.8rem", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
               {data.filename}
             </span>
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.9rem", color: isComplete ? "#52c41a" : "#1890ff", fontWeight: "700" }}>
            {isComplete ? "Done" : `${Math.round(data.percentage)}%`}
            </span>
            
            {!isComplete && (
                <button 
                    onClick={onCancel}
                    title="Cancel Transfer"
                    style={{
                        border: "none", background: "transparent", color: "#9ca3af", 
                        cursor: "pointer", padding: "4px", 
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: "50%", transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => {e.currentTarget.style.backgroundColor = "#fee2e2"; e.currentTarget.style.color = "#ef4444"}}
                    onMouseOut={(e) => {e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#9ca3af"}}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            )}
        </div>
      </div>

      <div style={{ width: "100%", height: "6px", backgroundColor: "#f0f2f5", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{
          width: `${data.percentage}%`,
          height: "100%",
          backgroundColor: isComplete ? "#52c41a" : "#1890ff",
          borderRadius: "3px",
          transition: "width 0.2s linear, background-color 0.3s"
        }} />
      </div>
    </div>
  );
};

const FileRequestModal = ({ offer, onAccept, onReject }) => {
  if (!offer) return null;

  const formatSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        backgroundColor: "white", padding: "24px", borderRadius: "16px", width: "360px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)", fontFamily: "'Segoe UI', sans-serif",
        animation: "fadeIn 0.2s ease-out"
      }}>
        <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#111", fontSize: "1.25rem", fontWeight: "700" }}>Incoming File</h3>
        <p style={{marginBottom: "24px", color: "#666", lineHeight: "1.5", fontSize: "0.95rem"}}>
          <strong style={{color: "#333"}}>{offer.sender}</strong> wants to send you a file.
        </p>
        
        <div style={{ 
          padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "12px", 
          marginBottom: "24px", border: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: "16px"
        }}>
           <div style={{ fontSize: "32px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}>📄</div>
           <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: "600", color: "#333", fontSize: "1rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{offer.filename}</div>
              <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "4px" }}>{formatSize(offer.size)}</div>
           </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            onClick={onReject}
            style={{ flex: 1, padding: "12px", border: "1px solid #e0e0e0", background: "white", borderRadius: "10px", cursor: "pointer", fontSize: "0.95rem", color: "#666", fontWeight: "600", transition: "all 0.2s" }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#f5f5f5"}
            onMouseOut={(e) => e.target.style.backgroundColor = "white"}
          >
            Reject
          </button>
          <button 
            onClick={onAccept}
            style={{ flex: 1, padding: "12px", border: "none", background: "#1890ff", color: "white", borderRadius: "10px", cursor: "pointer", fontSize: "0.95rem", fontWeight: "600", boxShadow: "0 4px 12px rgba(24, 144, 255, 0.3)", transition: "all 0.2s" }}
            onMouseOver={(e) => { e.target.style.backgroundColor = "#40a9ff"; e.target.style.transform = "translateY(-1px)"; }}
            onMouseOut={(e) => { e.target.style.backgroundColor = "#1890ff"; e.target.style.transform = "translateY(0)"; }}
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
  const [transferProgress, setTransferProgress] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const activePeerRef = useRef(activePeer);

  const closeMenu = () => setShowAttachMenu(false);

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

    const stopProgress = EventsOn("file:progress", (data) => {
        setTransferProgress(data);
        if (data.percentage >= 100) {
            setTimeout(() => {
                setTransferProgress(null);
            }, 3000);
        }
    });

    GetPeers().then((existingPeers) => {
      if (existingPeers) existingPeers.forEach((peer) => addPeer(peer));
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
      await AcceptFileOffer(incomingOffer.sender, incomingOffer.filename, incomingOffer.size);
      setIncomingOffer(null);
      setTransferProgress({ filename: incomingOffer.filename, percentage: 0, type: "download" });
  };

  const handleRejectFile = async () => {
     console.log("Rejected file");
     await DeclineFileOffer(incomingOffer.sender, incomingOffer.filename);
     setIncomingOffer(null);
  };
  
  const handleCancelTransfer = () => {
      setTransferProgress(null);
  };

  const handleMenuSelect = (type) => {
      setShowAttachMenu(false);
      if (type === 'file') {
          SelectAndSendFile(activePeer);
      } else {
          SelectAndSendFolder(activePeer);
      }
  };

  const formatAddress = (addr) => addr.split(":")[0];
  const currentMessages = activePeer ? (messages[activePeer] || []) : [];

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "'Segoe UI', sans-serif", backgroundColor: "#fff" }}>
      
      <TransferProgress data={transferProgress} onCancel={handleCancelTransfer} />

      <FileRequestModal 
        offer={incomingOffer} 
        onAccept={handleAcceptFile} 
        onReject={handleRejectFile} 
      />

      <div style={{ width: "280px", backgroundColor: "#f9fafb", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#fff" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#111", fontWeight: "700" }}>Peers</h2>
          <span style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "4px", display: "block" }}>{peers.length} active nearby</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {peers.length === 0 ? (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "#9ca3af", fontSize: "0.95rem" }}>
              Scanning network...
            </div>
          ) : (
            peers.map((peer) => {
              const isActive = activePeer === peer;
              const isUnread = !!unread[peer];

              return (
                <div
                  key={peer}
                  onClick={() => setActivePeer(peer)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", marginBottom: "8px", borderRadius: "12px", cursor: "pointer",
                    backgroundColor: isActive ? "#e6f7ff" : "transparent",
                    transition: "all 0.2s",
                    position: "relative"
                  }}
                  onMouseOver={(e) => !isActive && (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                  onMouseOut={(e) => !isActive && (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div style={{ 
                    width: "40px", height: "40px", 
                    backgroundColor: isActive ? "#1890ff" : "#fff", 
                    borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", 
                    boxShadow: isActive ? "0 4px 10px rgba(24, 144, 255, 0.3)" : "0 1px 2px rgba(0,0,0,0.05)",
                    border: isActive ? "none" : "1px solid #e5e7eb"
                  }}>
                    <ComputerIcon color={isActive ? "#fff" : "#6b7280"} size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: isActive ? "600" : "500", fontSize: "0.95rem", color: isActive ? "#000" : "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatAddress(peer)}</div>
                    <div style={{ fontSize: "0.8rem", color: isActive ? "#1890ff" : "#9ca3af" }}>{isActive ? "Connected" : "Online"}</div>
                  </div>
                  
                  {isUnread && (
                    <div style={{ width: "8px", height: "8px", backgroundColor: "#1890ff", borderRadius: "50%" }}></div>
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
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#fff", zIndex: 10 }}>
               <div style={{ position: "relative" }}>
                 <UserAvatar size={40} />
                 <div style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "12px", height: "12px", background: "#52c41a", borderRadius: "50%", border: "2px solid #fff" }}></div>
               </div>
               <div>
                 <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#111" }}>{formatAddress(activePeer)}</h3>
                 <span style={{ fontSize: "0.8rem", color: "#1890ff" }}>Direct Connection</span>
               </div>
            </div>

            <div 
                style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "#ffffff" }}
                onClick={closeMenu}
            >
              {currentMessages.length === 0 && (
                 <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#d1d5db" }}>
                    <NetworkIcon />
                    <p style={{ marginTop: "16px" }}>No messages yet</p>
                 </div>
              )}
              
              {currentMessages.map((m, i) => {
                const isMe = m.from === "me";
                return (
                  <div key={i} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                    {!isMe && <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "12px", marginBottom: "4px" }}>{formatAddress(m.from)}</div>}
                    <div style={{
                      padding: "12px 18px", borderRadius: "20px",
                      borderTopLeftRadius: isMe ? "20px" : "4px", borderTopRightRadius: isMe ? "4px" : "20px",
                      backgroundColor: isMe ? "#1890ff" : "#f3f4f6", 
                      color: isMe ? "#fff" : "#1f2937",
                      lineHeight: "1.5", 
                      boxShadow: isMe ? "0 4px 12px rgba(24, 144, 255, 0.2)" : "none",
                      fontSize: "0.95rem"
                    }}>
                      {m.msg}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: "24px", borderTop: "1px solid #e5e7eb", backgroundColor: "#fff" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                
                <div style={{ position: "relative" }}>
                    {showAttachMenu && (
                        <div style={{
                            position: "absolute",
                            bottom: "60px",
                            left: "0",
                            backgroundColor: "white",
                            borderRadius: "12px",
                            boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                            border: "1px solid #f0f0f0",
                            padding: "6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            minWidth: "140px",
                            zIndex: 100
                        }}>
                            <button
                                onClick={() => handleMenuSelect('file')}
                                style={{
                                    display: "flex", alignItems: "center", gap: "10px",
                                    padding: "10px 12px", border: "none", background: "transparent",
                                    cursor: "pointer", borderRadius: "8px",
                                    color: "#374151", fontSize: "0.9rem", fontWeight: "500",
                                    transition: "background 0.2s"
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                                <FileIcon size={18} /> Send File
                            </button>
                            <button
                                onClick={() => handleMenuSelect('folder')}
                                style={{
                                    display: "flex", alignItems: "center", gap: "10px",
                                    padding: "10px 12px", border: "none", background: "transparent",
                                    cursor: "pointer", borderRadius: "8px",
                                    color: "#374151", fontSize: "0.9rem", fontWeight: "500",
                                    transition: "background 0.2s"
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                                <FolderIcon size={18} /> Send Folder
                            </button>
                        </div>
                    )}

                    <button 
                    onClick={() => setShowAttachMenu(!showAttachMenu)} 
                    style={{ 
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: "48px", height: "48px", 
                        backgroundColor: showAttachMenu ? "#e5e7eb" : "#f3f4f6", 
                        border: "none", borderRadius: "50%", cursor: "pointer", 
                        color: "#4b5563", flexShrink: 0, transition: "all 0.2s",
                        transform: showAttachMenu ? "rotate(45deg)" : "rotate(0deg)"
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#e5e7eb"; }}
                    onMouseOut={(e) => { if(!showAttachMenu) e.currentTarget.style.backgroundColor = "#f3f4f6"; }}
                    title="Attach"
                    >
                    <PlusIcon size={22} /> 
                    </button>
                </div>

                <input 
                  style={{ flex: 1, padding: "14px 20px", borderRadius: "24px", border: "1px solid #e5e7eb", outline: "none", fontSize: "0.95rem", backgroundColor: "#f9fafb", transition: "border-color 0.2s" }}
                  value={input} 
                  onKeyDown={(e) => e.key === "Enter" && send()} 
                  onChange={(e) => setInput(e.target.value)} 
                  onFocus={(e) => {e.target.style.borderColor = "#1890ff"; closeMenu();}}
                  onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  placeholder="Type a message..." 
                />
                <button 
                  onClick={send} 
                  style={{ padding: "0 28px", height: "48px", backgroundColor: "#1890ff", color: "white", border: "none", borderRadius: "24px", cursor: "pointer", fontWeight: "600", fontSize: "0.95rem", boxShadow: "0 4px 12px rgba(24, 144, 255, 0.3)", transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#40a9ff"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#1890ff"}
                >
                  Send
                </button>
              </div>
            </div>
          </>
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