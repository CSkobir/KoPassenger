export function formatSmartTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d - now;
  const diffHours = diffMs / 3600000;
  
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (Math.abs(diffHours) < 24 && d.getDate() === now.getDate()) {
    if (diffMs > 0 && diffMs < 3600000) {
      const mins = Math.ceil(diffMs / 60000);
      return `Today, in ${mins} min${mins !== 1 ? 's' : ''}`;
    }
    if (diffMs < 0 && diffMs > -3600000) {
      const mins = Math.abs(Math.ceil(diffMs / 60000));
      return `${mins} min${mins !== 1 ? 's' : ''} ago`;
    }
    return `Today at ${timeStr}`;
  }
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth() && d.getFullYear() === tomorrow.getFullYear()) {
    return `Tomorrow at ${timeStr}`;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
    return `Yesterday at ${timeStr}`;
  }
  
  return d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
