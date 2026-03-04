import { formatSize } from "../utils";

const FileRequestModal = ({ offer, onAccept, onReject }) => {
  if (!offer) return null;

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
        <p style={{ marginBottom: "24px", color: "#666", lineHeight: "1.5", fontSize: "0.95rem" }}>
          <strong style={{ color: "#333" }}>{offer.sender}</strong> wants to send you a file.
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

export default FileRequestModal;
