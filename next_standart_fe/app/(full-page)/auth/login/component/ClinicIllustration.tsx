import React from 'react';

export default function ClinicIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`clinic-illustration-wrapper ${className}`}>
      <svg
        viewBox="0 0 520 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="clinic-illustration-svg"
        style={{ width: '100%', height: 'auto', maxHeight: '380px', display: 'block' }}
      >
        <defs>
          {/* Backdrop Soft Mint Gradients */}
          <linearGradient id="bgOvalGrad" x1="260" y1="30" x2="260" y2="370" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.45" />
          </linearGradient>

          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d1fae5" stopOpacity="0" />
          </radialGradient>

          {/* Scrub Gradients */}
          {/* Doctor Scrub: Rich Emerald */}
          <linearGradient id="docScrub" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          
          {/* Nurse Left Scrub: Vibrant Mint */}
          <linearGradient id="nurseScrub" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Aesthetician Right Scrub: Fresh Jade */}
          <linearGradient id="aestScrub" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Shadow filters */}
          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#064e3b" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* ── BACKGROUND ORGANIC OVAL & GLOW ── */}
        <ellipse cx="260" cy="225" rx="205" ry="155" fill="url(#bgOvalGrad)" />
        <ellipse cx="260" cy="225" rx="160" ry="120" fill="url(#centerGlow)" />

        {/* Decorative Floating Crosses & Sparkles */}
        {/* Top Left Cross */}
        <g opacity="0.75">
          <rect x="85" y="115" width="22" height="7" rx="3.5" fill="#34d399" />
          <rect x="92.5" y="107.5" width="7" height="22" rx="3.5" fill="#34d399" />
        </g>

        {/* Top Center Sparkle */}
        <path
          d="M260 42 C260 52 254 58 244 58 C254 58 260 64 260 74 C260 64 266 58 276 58 C266 58 260 52 260 42 Z"
          fill="#10b981"
          opacity="0.8"
        />

        {/* Top Right Sparkle */}
        <path
          d="M425 90 C425 98 420 103 412 103 C420 103 425 108 425 116 C425 108 430 103 438 103 C430 103 425 98 425 90 Z"
          fill="#059669"
          opacity="0.7"
        />

        {/* Bottom Left Small Cross */}
        <g opacity="0.6">
          <rect x="68" y="270" width="16" height="5" rx="2.5" fill="#6ee7b7" />
          <rect x="73.5" y="264.5" width="5" height="16" rx="2.5" fill="#6ee7b7" />
        </g>

        {/* Floating Tiny Dots */}
        <circle cx="120" cy="80" r="3.5" fill="#34d399" opacity="0.6" />
        <circle cx="395" cy="65" r="4" fill="#6ee7b7" opacity="0.7" />
        <circle cx="450" cy="180" r="3" fill="#10b981" opacity="0.5" />
        <circle cx="75" cy="190" r="4" fill="#a7f3d0" opacity="0.8" />


        {/* ════════════════════════════════════════════════════════════════
            CHARACTER 1: LEFT NURSE / BEAUTICIAN WITH MASK & THUMBS UP
           ════════════════════════════════════════════════════════════════ */}
        <g id="left-nurse" filter="url(#softShadow)">
          {/* Hair Back */}
          <path d="M110 160 C100 135 115 105 142 102 C168 99 180 120 178 145 C175 168 160 185 142 188 C125 190 115 178 110 160 Z" fill="#2d1b16" />

          {/* Neck & Chest */}
          <path d="M136 175 L154 175 L156 200 L134 200 Z" fill="#fcd3b8" />

          {/* Head / Face */}
          <path d="M126 138 C126 122 136 112 148 112 C160 112 168 122 168 138 C168 152 159 168 148 168 C137 168 126 152 126 138 Z" fill="#fedac2" />

          {/* Hair Front / Bangs */}
          <path d="M125 132 C128 118 140 106 155 106 C168 106 170 118 169 130 C162 122 150 118 138 123 C132 125 128 128 125 132 Z" fill="#3e2723" />
          {/* Hair strands on sides */}
          <path d="M125 130 C123 145 125 165 130 172 C127 160 125 145 126 132 Z" fill="#2d1b16" />

          {/* Eyes & Eyebrows (smiling eyes behind mask) */}
          <path d="M134 133 C137 130 142 131 144 134" stroke="#2d1b16" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M152 133 C155 130 160 131 162 134" stroke="#2d1b16" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M133 128 C136 126 141 126 144 128" stroke="#3e2723" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M152 128 C155 126 160 126 163 128" stroke="#3e2723" strokeWidth="1.6" strokeLinecap="round" />

          {/* Medical Face Mask (White with mint seam) */}
          <path d="M127 142 C127 138 146 137 165 141 C167 155 160 169 146 170 C132 170 126 156 127 142 Z" fill="#ffffff" stroke="#d1fae5" strokeWidth="1.2" />
          <path d="M129 148 Q146 152 163 148" stroke="#a7f3d0" strokeWidth="1.2" fill="none" />
          {/* Mask Straps */}
          <path d="M127 144 C123 144 122 152 125 154" stroke="#e2e8f0" strokeWidth="1.2" fill="none" />
          <path d="M165 144 C168 144 169 152 166 154" stroke="#e2e8f0" strokeWidth="1.2" fill="none" />

          {/* Scrub Body */}
          <path d="M112 215 C118 196 132 190 146 190 C160 190 174 196 180 215 L186 330 L108 330 Z" fill="url(#nurseScrub)" />
          
          {/* Scrub V-Neck Collar */}
          <path d="M136 190 L146 206 L156 190" stroke="#047857" strokeWidth="2.5" fill="#fcd3b8" />

          {/* Left Arm & Thumbs-Up Hand */}
          {/* Sleeve */}
          <path d="M118 196 C105 208 92 225 86 242 C92 245 100 248 106 244 C110 230 118 215 125 205 Z" fill="#059669" />
          {/* Arm */}
          <path d="M88 238 L72 265 L84 272 L98 245 Z" fill="#fedac2" />
          {/* Forearm angled up */}
          <path d="M72 265 C68 250 66 235 68 218 L80 220 C78 234 80 248 84 260 Z" fill="#fedac2" />
          
          {/* Hand Thumbs Up */}
          <g transform="translate(62, 192)">
            {/* Thumb */}
            <path d="M12 18 C10 14 11 8 15 8 C18 8 18 14 18 18 Z" fill="#fedac2" stroke="#fcd3b8" strokeWidth="0.8" />
            {/* Fist Fingers */}
            <rect x="10" y="18" width="14" height="15" rx="5" fill="#fedac2" />
            <path d="M12 22 L22 22 M12 26 L22 26 M12 30 L20 30" stroke="#f0bba0" strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* Right Arm resting down */}
          <path d="M174 200 C182 215 188 235 190 258 L176 260 C174 240 170 222 165 208 Z" fill="#059669" />
        </g>


        {/* ════════════════════════════════════════════════════════════════
            CHARACTER 2: CENTER DOCTOR / DERMATOLOGIST (MALE LEAD)
           ════════════════════════════════════════════════════════════════ */}
        <g id="center-doctor" filter="url(#softShadow)">
          {/* Doctor Neck */}
          <path d="M246 160 L274 160 L278 190 L242 190 Z" fill="#e8b999" />

          {/* Doctor Head */}
          <path d="M234 115 C234 94 246 84 260 84 C274 84 286 94 286 115 C286 136 276 156 260 156 C244 156 234 136 234 115 Z" fill="#f8cbb0" />

          {/* Hair (Neat modern male doctor cut) */}
          <path d="M232 110 C232 88 245 74 262 74 C278 74 290 85 288 104 C282 98 274 96 264 96 C250 96 240 102 234 112 Z" fill="#1e293b" />
          {/* Sideburns */}
          <path d="M234 108 L234 122 L238 120 L238 108 Z" fill="#1e293b" />
          <path d="M286 108 L286 122 L282 120 L282 108 Z" fill="#1e293b" />

          {/* Ears */}
          <circle cx="233" cy="120" r="5.5" fill="#f8cbb0" />
          <circle cx="287" cy="120" r="5.5" fill="#f8cbb0" />

          {/* Eyebrows */}
          <path d="M242 108 C246 105 252 106 254 108" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M266 108 C268 106 274 105 278 108" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />

          {/* Eyes (Friendly confident gaze) */}
          <ellipse cx="248" cy="116" rx="2.5" ry="3" fill="#0f172a" />
          <ellipse cx="272" cy="116" rx="2.5" ry="3" fill="#0f172a" />
          <circle cx="249" cy="115" r="0.8" fill="#ffffff" />
          <circle cx="273" cy="115" r="0.8" fill="#ffffff" />

          {/* Nose */}
          <path d="M259 116 L257 127 L263 127" stroke="#e0a382" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Confident Smile */}
          <path d="M250 136 Q260 144 270 136" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M252 136 Q260 142 268 136" fill="#ffffff" />

          {/* Scrub Main Body (Emerald Green) */}
          <path d="M216 195 C226 182 244 178 260 178 C276 178 294 182 304 195 L314 340 L206 340 Z" fill="url(#docScrub)" />

          {/* Scrub V-Neck & Inner White Undershirt */}
          <path d="M246 178 L260 206 L274 178 Z" fill="#ffffff" />
          <path d="M249 178 L260 200 L271 178" stroke="#047857" strokeWidth="2.8" fill="#e8b999" />

          {/* Doctor ID Badge Pocket */}
          <rect x="228" y="222" width="22" height="26" rx="3" fill="#047857" stroke="#065f46" strokeWidth="1" />
          <rect x="232" y="217" width="14" height="6" rx="1.5" fill="#e2e8f0" />
          <rect x="232" y="227" width="14" height="2.5" rx="1" fill="#6ee7b7" />
          <rect x="232" y="232" width="10" height="2" rx="1" fill="#a7f3d0" />

          {/* Hands on Hips Arms */}
          {/* Left Shoulder & Arm */}
          <path d="M220 192 C204 206 190 228 185 252 C190 256 200 258 206 254 C211 236 219 218 228 204 Z" fill="#047857" />
          {/* Forearm to Hip */}
          <path d="M188 250 L212 284 L224 278 L204 246 Z" fill="#f8cbb0" />
          {/* Left Hand at waist */}
          <ellipse cx="218" cy="284" rx="8" ry="6" fill="#f8cbb0" />

          {/* Right Shoulder & Arm */}
          <path d="M300 192 C316 206 330 228 335 252 C330 256 320 258 314 254 C309 236 301 218 292 204 Z" fill="#047857" />
          {/* Forearm to Hip */}
          <path d="M332 250 L308 284 L296 278 L316 246 Z" fill="#f8cbb0" />
          {/* Right Hand at waist */}
          <ellipse cx="302" cy="284" rx="8" ry="6" fill="#f8cbb0" />

          {/* STETHOSCOPE (Around Doctor's Neck) */}
          {/* Rubber Tubing */}
          <path
            d="M244 176 C238 190 236 218 244 238 C248 248 256 254 260 255 C264 254 272 248 276 238 C284 218 282 190 276 176"
            stroke="#1e293b"
            strokeWidth="3.8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Metal Chest Piece / Bell */}
          <circle cx="260" cy="256" r="7" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
          <circle cx="260" cy="256" r="4" fill="#94a3b8" />
          <circle cx="260" cy="256" r="1.5" fill="#f8fafc" />
        </g>


        {/* ════════════════════════════════════════════════════════════════
            CHARACTER 3: RIGHT AESTHETICIAN / DERMATOLOGIST WITH CLIPBOARD
           ════════════════════════════════════════════════════════════════ */}
        <g id="right-aesthetician" filter="url(#softShadow)">
          {/* Hair Bun / Back Hair */}
          <ellipse cx="375" cy="112" rx="18" ry="18" fill="#d97706" />
          <circle cx="388" cy="100" r="12" fill="#b45309" />
          {/* Hair Bun Scrunchie */}
          <ellipse cx="384" cy="104" rx="8" ry="5" fill="#10b981" />

          {/* Neck */}
          <path d="M366 175 L384 175 L386 200 L364 200 Z" fill="#fedac2" />

          {/* Head */}
          <path d="M356 136 C356 118 368 108 380 108 C392 108 402 118 402 136 C402 152 392 168 380 168 C368 168 356 152 356 136 Z" fill="#fde2cb" />

          {/* Blonde/Auburn Hair Style */}
          <path d="M355 130 C358 112 372 104 388 104 C402 104 406 116 405 128 C398 120 384 116 370 120 C362 122 358 126 355 130 Z" fill="#d97706" />
          <path d="M400 128 C403 140 404 156 400 165 C404 152 404 138 402 126 Z" fill="#b45309" />

          {/* Chic Aesthetic Glasses (Rose Gold / Green frame) */}
          <circle cx="369" cy="134" r="7.5" stroke="#059669" strokeWidth="1.8" fill="rgba(255,255,255,0.4)" />
          <circle cx="389" cy="134" r="7.5" stroke="#059669" strokeWidth="1.8" fill="rgba(255,255,255,0.4)" />
          <path d="M376.5 134 L381.5 134" stroke="#059669" strokeWidth="1.8" />
          <path d="M361.5 133 L357 132" stroke="#059669" strokeWidth="1.5" />
          <path d="M396.5 133 L401 132" stroke="#059669" strokeWidth="1.5" />

          {/* Eyes behind glasses */}
          <ellipse cx="369" cy="134" rx="2" ry="2.2" fill="#2d1b16" />
          <ellipse cx="389" cy="134" rx="2" ry="2.2" fill="#2d1b16" />
          <circle cx="370" cy="133" r="0.7" fill="#ffffff" />
          <circle cx="390" cy="133" r="0.7" fill="#ffffff" />

          {/* Eyebrows */}
          <path d="M364 124 C367 122 372 122 374 124" stroke="#92400e" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M384 124 C387 122 392 122 394 124" stroke="#92400e" strokeWidth="1.6" strokeLinecap="round" />

          {/* Nose & Friendly Smile with Lipstick */}
          <path d="M378 136 L377 144 L381 144" stroke="#e0a382" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M372 152 Q379 157 386 152" stroke="#be123c" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Scrub Main Body */}
          <path d="M344 215 C350 196 364 190 378 190 C392 190 406 196 412 215 L418 330 L340 330 Z" fill="url(#aestScrub)" />

          {/* V-Neck Collar */}
          <path d="M368 190 L378 206 L388 190" stroke="#047857" strokeWidth="2.5" fill="#fedac2" />

          {/* Left Arm holding clipboard */}
          <path d="M352 198 C344 212 336 232 338 255 L352 258 C354 238 358 222 364 208 Z" fill="#059669" />

          {/* Right Arm wrapping around clipboard */}
          <path d="M404 198 C415 212 422 232 426 254 L414 258 C410 240 405 224 396 208 Z" fill="#059669" />

          {/* MEDICAL DOSSIER / CLIPBOARD */}
          <g id="clipboard" transform="translate(352, 230)">
            {/* Clipboard Board (Dark Slate) */}
            <rect x="0" y="0" width="54" height="72" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.2" />
            {/* Top Metal Clip */}
            <rect x="17" y="-5" width="20" height="8" rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
            <circle cx="27" cy="-1" r="2" fill="#f8fafc" />

            {/* Medical Sheet Paper (White) */}
            <rect x="5" y="8" width="44" height="58" rx="2" fill="#ffffff" />
            
            {/* Paper Header / Cross */}
            <rect x="9" y="13" width="10" height="3" rx="1" fill="#10b981" />
            <rect x="12.5" y="9.5" width="3" height="10" rx="1" fill="#10b981" />
            <rect x="23" y="12" width="20" height="3" rx="1.5" fill="#059669" />
            <rect x="23" y="17" width="14" height="2" rx="1" fill="#94a3b8" />

            {/* Content Lines */}
            <rect x="9" y="24" width="36" height="2" rx="1" fill="#cbd5e1" />
            <rect x="9" y="29" width="32" height="2" rx="1" fill="#cbd5e1" />
            <rect x="9" y="34" width="36" height="2" rx="1" fill="#cbd5e1" />
            <rect x="9" y="39" width="26" height="2" rx="1" fill="#cbd5e1" />
            <rect x="9" y="44" width="34" height="2" rx="1" fill="#cbd5e1" />
            
            {/* Checklist items */}
            <circle cx="12" cy="52" r="2" fill="#10b981" />
            <rect x="17" y="51" width="24" height="2" rx="1" fill="#64748b" />
            <circle cx="12" cy="58" r="2" fill="#10b981" />
            <rect x="17" y="57" width="18" height="2" rx="1" fill="#64748b" />

            {/* Hand Fingers holding clipboard */}
            <rect x="-3" y="34" width="10" height="18" rx="4" fill="#fde2cb" />
            <rect x="47" y="32" width="10" height="18" rx="4" fill="#fde2cb" />
          </g>
        </g>
      </svg>
    </div>
  );
}
