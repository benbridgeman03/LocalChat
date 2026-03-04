import { useRef, useState } from "react";
import { SelectAndSendFile, SelectAndSendFolder } from "../../wailsjs/go/backend/PeerService";
import { NetworkIcon, UserAvatar, PlusIcon, FileIcon, FolderIcon } from "./Icons";
import { formatAddress } from "../utils";

const AttachMenu = ({ peer, show, onClose }) => {
  if (!show) return null;

  const handleSelect = (type) => {
    onClose();
    if (type === 'file') {
      SelectAndSendFile(peer);
    } else {
      SelectAndSendFolder(peer);
    }
  };

  const menuButtonStyle = {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 12px", border: "none", background: "transparent",
    cursor: "pointer", borderRadius: "8px",
    color: "#374151", fontSize: "0.9rem", fontWeight: "500",
    transition: "background 0.2s"
  };

  return (
    <div style={{
      position: "absolute", bottom: "60px", left: "0",
      backgroundColor: "white", borderRadius: "12px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.15)", border: "1px solid #f0f0f0",
      padding: "6px", display: "flex", flexDirection: "column", gap: "4px",
      minWidth: "140px", zIndex: 100
    }}>
      <button
        onClick={() => handleSelect('file')}
        style={menuButtonStyle}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
      >
        <FileIcon size={18} /> Send File
      </button>
      <button
        onClick={() => handleSelect('folder')}
        style={menuButtonStyle}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
      >
        <FolderIcon size={18} /> Send Folder
      </button>
    </div>
  );
};

const MessageBubble = ({ message }) => {
  const isMe = message.from === "me";

  return (
    <div style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "70%" }}>
      {!isMe && <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "12px", marginBottom: "4px" }}>{formatAddress(message.from)}</div>}
      <div style={{
        padding: "12px 18px", borderRadius: "20px",
        borderTopLeftRadius: isMe ? "20px" : "4px", borderTopRightRadius: isMe ? "4px" : "20px",
        backgroundColor: isMe ? "#1890ff" : "#f3f4f6",
        color: isMe ? "#fff" : "#1f2937",
        lineHeight: "1.5",
        boxShadow: isMe ? "0 4px 12px rgba(24, 144, 255, 0.2)" : "none",
        fontSize: "0.95rem"
      }}>
        {message.msg}
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#d1d5db" }}>
    <NetworkIcon />
    <p style={{ marginTop: "16px" }}>No messages yet</p>
  </div>
);

const ChatView = ({ peer, messages, onSend }) => {
  const [input, setInput] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef(null);

  const closeMenu = () => setShowAttachMenu(false);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#fff", zIndex: 10 }}>
        <div style={{ position: "relative" }}>
          <UserAvatar size={40} />
          <div style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "12px", height: "12px", background: "#52c41a", borderRadius: "50%", border: "2px solid #fff" }}></div>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#111" }}>{formatAddress(peer)}</h3>
          <span style={{ fontSize: "0.8rem", color: "#1890ff" }}>Direct Connection</span>
        </div>
      </div>

      <div
        style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "#ffffff" }}
        onClick={closeMenu}
      >
        {messages.length === 0 && <EmptyState />}
        {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: "24px", borderTop: "1px solid #e5e7eb", backgroundColor: "#fff" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>

          <div style={{ position: "relative" }}>
            <AttachMenu peer={peer} show={showAttachMenu} onClose={closeMenu} />
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
              onMouseOut={(e) => { if (!showAttachMenu) e.currentTarget.style.backgroundColor = "#f3f4f6"; }}
              title="Attach"
            >
              <PlusIcon size={22} />
            </button>
          </div>

          <input
            style={{ flex: 1, padding: "14px 20px", borderRadius: "24px", border: "1px solid #e5e7eb", outline: "none", fontSize: "0.95rem", backgroundColor: "#f9fafb", transition: "border-color 0.2s" }}
            value={input}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            onChange={(e) => setInput(e.target.value)}
            onFocus={(e) => { e.target.style.borderColor = "#1890ff"; closeMenu(); }}
            onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
            placeholder="Type a message..."
          />
          <button
            onClick={handleSend}
            style={{ padding: "0 28px", height: "48px", backgroundColor: "#1890ff", color: "white", border: "none", borderRadius: "24px", cursor: "pointer", fontWeight: "600", fontSize: "0.95rem", boxShadow: "0 4px 12px rgba(24, 144, 255, 0.3)", transition: "all 0.2s" }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#40a9ff"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#1890ff"}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatView;
