import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffb86b',
      }}
    >
      <svg width="140" height="140" viewBox="0 0 32 32">
        <g fill="none" stroke="#1e1408" strokeWidth="2.5">
          <circle cx="11" cy="16" r="5.5" />
          <circle cx="21" cy="16" r="5.5" />
        </g>
        <circle cx="11" cy="16" r="1.6" fill="#1e1408" />
        <circle cx="21" cy="16" r="1.6" fill="#1e1408" />
      </svg>
    </div>,
    size,
  );
}
