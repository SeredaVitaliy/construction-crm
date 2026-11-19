import { Avatar } from 'antd';
import { initials } from '@/lib/format';

const COLORS = ['#255E8C', '#3F7D4E', '#B4532A', '#6B5B95', '#2F7F86', '#8A6D1E'];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function UserAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <Avatar size={size} style={{ background: COLORS[hash(name) % COLORS.length], flexShrink: 0, fontSize: size * 0.4 }}>
      {initials(name)}
    </Avatar>
  );
}
