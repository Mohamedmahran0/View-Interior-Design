import { ImageResponse } from 'next/og';

export const alt = 'View Interior Design — Smart Interior Design Platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 60%, #064e3b 100%)',
          fontFamily: 'system-ui, sans-serif',
          color: 'white',
          padding: 80,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 160,
            height: 160,
            borderRadius: 36,
            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            fontSize: 96,
            fontWeight: 900,
            color: 'white',
            marginBottom: 40,
            boxShadow: '0 0 80px rgba(16,185,129,0.45)',
          }}
        >
          V
        </div>
        <div style={{ fontSize: 68, fontWeight: 800, textAlign: 'center' }}>
          View Interior Design
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 34,
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          Design · Export · Share — interior walkthroughs in one click
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 24,
            color: '#10b981',
            letterSpacing: 4,
            fontWeight: 600,
          }}
        >
          VIEW INTERIOR DESIGN PLATFORM
        </div>
      </div>
    ),
    size
  );
}