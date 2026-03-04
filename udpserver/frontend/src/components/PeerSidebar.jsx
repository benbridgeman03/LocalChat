import { ComputerIcon } from "./Icons";
import { formatAddress } from "../utils";

const PeerSidebar = ({ peers, activePeer, unread, onSelectPeer }) => (
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
              onClick={() => onSelectPeer(peer)}
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
);

export default PeerSidebar;
