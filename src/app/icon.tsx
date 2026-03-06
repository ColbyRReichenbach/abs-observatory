import { ImageResponse } from 'next/og'

export const size = {
    width: 32,
    height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'black',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    color: 'white',
                }}
            >
                <svg fill="none" width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {/* Shift the entire drawing to visually perfectly center it within the circle since it lacks a right arm */}
                    <g transform="translate(1.5, 2)">
                        {/* Head / Visor */}
                        <rect x="7" y="5" width="10" height="8" rx="2" />
                        <line x1="12" y1="2" x2="12" y2="5" />
                        <circle cx="12" cy="2" r="1" fill="currentColor" />

                        {/* Futuristic Robot Eyes (Glowing blue visor look) */}
                        <line x1="9" y1="9" x2="15" y2="9" strokeWidth="3" stroke="#3b82f6" />

                        {/* Body */}
                        <path d="M9 13v4c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-4" />

                        {/* Windup Arm */}
                        <path d="M 7 13 L 2 13 L 2 8" />

                        {/* Baseball */}
                        <circle cx="2" cy="8" r="1.5" fill="currentColor" stroke="none" />
                    </g>
                </svg>
            </div>
        ),
        { ...size }
    )
}
