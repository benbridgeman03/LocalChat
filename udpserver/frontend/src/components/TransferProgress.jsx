import { CloseIcon } from "./Icons";

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
            <span style={{ fontSize: "16px" }}>{data.type === 'upload' ? '\u2B06\uFE0F' : '\u2B07\uFE0F'}</span>
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
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#fee2e2"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}
            >
              <CloseIcon />
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

export default TransferProgress;
