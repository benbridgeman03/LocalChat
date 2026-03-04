export const normalizeId = (addr) => {
  if (!addr) return "";
  const lastColon = addr.lastIndexOf(":");
  if (lastColon === -1) return `${addr}:4001`;
  let ip = addr.substring(0, lastColon);
  if (ip.startsWith("[") && ip.endsWith("]")) {
    ip = ip.substring(1, ip.length - 1);
  }
  return `${ip}:4001`;
};

export const formatAddress = (addr) => addr.split(":")[0];

export const formatSize = (bytes) => {
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
};
