'use client';

import { useFormik } from 'formik';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { showError, showSuccess, showWarning } from '../../../../lib/tools/generalTools';
import { signIn } from 'next-auth/react';
import { Toast } from 'primereact/toast';
import axios from 'axios';
import { LoginFormik, LoginState } from './component/interfaces';
import teamHeroImg from '@/public/layout/images/clinic-team-illustration.jpg';

export default function LoginPage() {
  const router = useRouter();
  const toast = useRef<Toast>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [state, setState] = useState<LoginState>({
    load: false,
    googleLoad: false,
  });

  const formik = useFormik<LoginFormik>({
    initialValues: {
      username: '',
      password: '',
      remember_me: true,
    },
    validate: (data: LoginFormik) => {
      const errors = {} as Record<keyof LoginFormik, string>;
      if (!data.username) {
        errors.username = 'Username wajib diisi';
      }
      if (!data.password) {
        errors.password = 'Password wajib diisi';
      }
      return errors;
    },
    onSubmit: (data) => {
      handleSubmit(data);
    },
  });

  const handleSubmit = async (data: LoginFormik) => {
    setState((p) => ({ ...p, load: true }));
    try {
      const { data: vaLogin } = await axios.post('/api/auth/login', {
        username: data.username.trim(),
        password: data.password,
        remember_me: data.remember_me ? '1' : '0',
      });

      const nAuth = await signIn('credentials', {
        userData: JSON.stringify(vaLogin.data),
        redirect: false,
      });

      if (nAuth?.error) {
        console.error('NextAuth signIn error:', nAuth);
        showError(
          toast,
          `Sesi login gagal dibuat (${nAuth.error}). Silakan refresh browser atau bersihkan cookie browser Anda.`
        );
      } else {
        setLoginSuccess(true);
        if (toast.current) {
          toast.current.show({
            severity: 'success',
            summary: 'Login Berhasil',
            detail: 'Selamat datang kembali! Mengalihkan ke Dashboard...',
            life: 2500,
          });
        }
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 600);
      }
    } catch (error: any) {
      const e = error?.response?.data || error;
      showError(toast, e.message || 'Gagal masuk ke sistem, periksa kembali username dan password Anda');
    } finally {
      setState((p) => ({ ...p, load: false }));
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    showWarning(
      toast,
      'Lupa kata sandi? Silakan hubungi Administrator IT atau Super Admin klinik untuk mereset kata sandi akun Anda.'
    );
  };

  return (
    <>
      <Toast ref={toast} position="top-right" className="kk-custom-toast" />

      {/* Google Fonts & Material Symbols */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,600&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <style>{`
        /* Scoped to Login Page Wrapper Only */
        .kk-page-wrapper,
        .kk-page-wrapper *,
        .kk-page-wrapper *::before,
        .kk-page-wrapper *::after {
          box-sizing: border-box;
        }

        .kk-page-wrapper {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: radial-gradient(130% 120% at 50% 0%, #ffffff 0%, #f0fdf4 50%, #e1f7ec 100%);
          color: #064e3b;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
          position: relative;
        }

        .font-serif-display {
          font-family: 'Playfair Display', Georgia, serif;
        }

        .kk-page-wrapper .material-symbols-outlined {
          font-family: 'Material Symbols Outlined', sans-serif;
          font-weight: normal;
          font-style: normal;
          font-size: 18px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
        }

        /* ── MAIN CONTAINER & CARD FRAME ── */
        .kk-main-card {
          width: 100%;
          max-width: 1080px;
          background: #ffffff;
          border-radius: 32px;
          border: 1px solid rgba(16, 185, 129, 0.2);
          box-shadow: 0 24px 60px -12px rgba(6, 78, 59, 0.12), 0 8px 24px -4px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.18fr 1fr;
          align-items: stretch;
          position: relative;
        }

        @media (max-width: 960px) {
          .kk-main-card {
            grid-template-columns: 1fr;
            max-width: 520px;
            margin: 20px auto;
          }
        }

        /* ── LEFT PANEL: Light Soft Mint Ambient & Elevated Illustration ── */
        .kk-left-panel {
          background: linear-gradient(160deg, #f0fdf9 0%, #e6faf2 50%, #d8f5e7 100%);
          border-right: 1px solid rgba(16, 185, 129, 0.15);
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 960px) {
          .kk-left-panel {
            border-right: none;
            border-bottom: 1px solid rgba(16, 185, 129, 0.15);
            padding: 36px 24px;
          }
        }

        /* Top Brand Tag & Headline (Symmetric & Balanced Spacing) */
        .kk-tag-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 999px;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);
          margin-bottom: 16px;
        }

        .kk-pulsing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
          animation: pulseAnim 2s infinite ease-in-out;
        }

        @keyframes pulseAnim {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.85); opacity: 0.45; }
        }

        .kk-tag-text {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: #059669;
          text-transform: uppercase;
          line-height: 1;
        }

        .kk-headline {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(22px, 2.1vw, 27px);
          font-weight: 700;
          color: #064e3b;
          line-height: 1.28;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .kk-headline-highlight {
          color: #059669;
          font-style: italic;
          font-weight: 600;
        }

        /* Elevated Floating Illustration Card */
        .kk-team-img-wrap {
          width: 100%;
          max-width: 440px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 24px auto 0 auto;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px -12px rgba(6, 78, 59, 0.16), 0 8px 16px -4px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(16, 185, 129, 0.25);
          background: #ffffff;
          transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .kk-team-img-wrap:hover {
          transform: translateY(-4px);
          box-shadow: 0 28px 48px -12px rgba(6, 78, 59, 0.22), 0 12px 20px -4px rgba(0, 0, 0, 0.06);
        }

        .kk-team-img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
        }

        /* ── RIGHT PANEL: Minimalist & Clean Login Card ── */
        .kk-right-panel {
          background: #ffffff;
          padding: 48px 44px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        @media (max-width: 960px) {
          .kk-right-panel {
            padding: 36px 24px;
          }
        }

        /* Brand Header Center */
        .kk-auth-brand-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 14px;
        }

        /* Logo Rounded Square (EXACT BRAND LOGO PRESERVED) */
        .kk-auth-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
          margin-bottom: 8px;
          transition: transform 180ms ease;
        }

        .kk-auth-icon-box:hover {
          transform: scale(1.05);
        }

        .kk-auth-portal-title {
          font-size: 17px;
          font-weight: 700;
          color: #059669;
          letter-spacing: -0.2px;
          line-height: 1.2;
        }

        .kk-auth-welcome {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 23px;
          font-weight: 700;
          color: #0d1f18;
          text-align: center;
          margin: 0 0 4px 0;
          letter-spacing: -0.2px;
        }

        .kk-auth-welcome-sub {
          font-size: 12.5px;
          color: #526359;
          text-align: center;
          margin: 0 0 20px 0;
        }

        /* Form Inputs with Consistent Spacing */
        .kk-form-group {
          margin-bottom: 16px;
          text-align: left;
        }

        .kk-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #0d1f18;
          margin-bottom: 8px;
        }

        .kk-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .kk-input-icon {
          position: absolute;
          left: 14px;
          color: #10b981;
          pointer-events: none;
          font-size: 19px;
        }

        .kk-input {
          width: 100%;
          height: 46px;
          padding-left: 42px;
          padding-right: 14px;
          background: #f8fdfa;
          border: 1.5px solid #d1fae5;
          border-radius: 12px;
          font-size: 13.5px;
          font-family: inherit;
          color: #0d1f18;
          outline: none;
          transition: all 180ms ease;
        }

        .kk-input.has-eye {
          padding-right: 42px;
        }

        .kk-input:focus {
          background: #ffffff;
          border-color: #10b981;
          box-shadow: 0 0 0 3.5px rgba(16, 185, 129, 0.16);
        }

        .kk-input::placeholder {
          color: #94a39b;
        }

        .kk-eye-btn {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          cursor: pointer;
          color: #707973;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: color 180ms ease;
        }

        .kk-eye-btn:hover {
          color: #10b981;
        }

        .kk-error-msg {
          font-size: 11.5px;
          color: #dc2626;
          margin-top: 4px;
          font-weight: 500;
        }

        .kk-form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 16px 0 24px 0;
        }

        .kk-remember-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12.5px;
          color: #334155;
          user-select: none;
        }

        .kk-remember-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #10b981;
          cursor: pointer;
          border-radius: 4px;
        }

        .kk-forgot-link {
          font-size: 12.5px;
          font-weight: 600;
          color: #059669;
          text-decoration: none;
          cursor: pointer;
          transition: color 180ms ease;
        }

        .kk-forgot-link:hover {
          color: #047857;
          text-decoration: underline;
        }

        /* Submit Button with Smooth Scale Hover */
        .kk-submit-btn {
          width: 100%;
          height: 48px;
          border-radius: 999px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          font-size: 14.5px;
          font-weight: 700;
          font-family: inherit;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
          transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .kk-submit-btn:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
          transform: scale(1.02) translateY(-1px);
        }

        .kk-submit-btn:active {
          transform: scale(0.99) translateY(0);
        }

        .kk-submit-btn:disabled {
          opacity: 0.8;
          cursor: not-allowed;
          transform: none;
        }

        /* Success Banner when logged in */
        .kk-success-banner {
          background: #ecfdf5;
          border: 1px solid #6ee7b7;
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          color: #065f46;
          font-size: 13px;
          font-weight: 600;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── CUSTOM TOAST STYLING ── */
        .kk-custom-toast.p-toast {
          z-index: 99999 !important;
        }

        .kk-custom-toast .p-toast-message {
          border-radius: 16px !important;
          border: 1px solid rgba(16, 185, 129, 0.3) !important;
          background: #ffffff !important;
          box-shadow: 0 16px 36px -4px rgba(6, 78, 59, 0.16), 0 4px 12px rgba(0, 0, 0, 0.04) !important;
          backdrop-filter: blur(12px) !important;
          overflow: hidden !important;
          margin-bottom: 12px !important;
        }

        .kk-custom-toast .p-toast-message-content {
          padding: 14px 18px !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
        }

        .kk-custom-toast .p-toast-message.p-toast-message-success {
          border-left: 5px solid #10b981 !important;
        }

        .kk-custom-toast .p-toast-message.p-toast-message-error {
          border-left: 5px solid #ef4444 !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
        }

        .kk-custom-toast .p-toast-message.p-toast-message-warn {
          border-left: 5px solid #f59e0b !important;
          border-color: rgba(245, 158, 11, 0.3) !important;
        }

        .kk-custom-toast .p-toast-summary {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          font-weight: 700 !important;
          font-size: 13.5px !important;
          color: #064e3b !important;
        }

        .kk-custom-toast .p-toast-detail {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          font-size: 12.5px !important;
          color: #374151 !important;
          margin-top: 2px !important;
        }

        .kk-custom-toast .p-toast-icon-close {
          color: #9ca3af !important;
          border-radius: 6px !important;
          transition: all 0.2s !important;
        }

        .kk-custom-toast .p-toast-icon-close:hover {
          color: #064e3b !important;
          background: rgba(16, 185, 129, 0.1) !important;
        }
      `}</style>

      <div className="kk-page-wrapper">
        <div className="kk-main-card">
          {/* ── LEFT PANEL: High Quality Medical Team Illustration & Brand Showcase ── */}
          <div className="kk-left-panel">
            {/* Top Brand Header */}
            <div>
              <div className="kk-tag-pill">
                <span className="kk-pulsing-dot"></span>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#059669' }}>
                  spa
                </span>
                <span className="kk-tag-text">KLINIK KECANTIKAN &amp; ESTETIKA</span>
              </div>

              <h1 className="kk-headline">
                Pancarkan Pesona Alami <br />
                <span className="kk-headline-highlight">Kulit Sehat &amp; Bersinar</span>
              </h1>
            </div>

            {/* Elevated Illustration Card */}
            <div className="kk-team-img-wrap">
              <Image
                src={teamHeroImg}
                alt="Tim Medis &amp; Dokter Spesialis Klinik Kecantikan"
                className="kk-team-img"
                priority
                sizes="(max-width: 768px) 100vw, 440px"
              />
            </div>
          </div>

          {/* ── RIGHT PANEL: Minimalist & Clean Login Form ── */}
          <div className="kk-right-panel">
            {/* Brand Logo (Exact Icon & Branding Preserved, Subtitle Removed) */}
            <div className="kk-auth-brand-center">
              <div className="kk-auth-icon-box">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                  spa
                </span>
              </div>
              <span className="kk-auth-portal-title">Klinik Kecantikan</span>
            </div>

            {/* Welcome Heading */}
            <h2 className="kk-auth-welcome">Selamat Datang</h2>
            <p className="kk-auth-welcome-sub">Silakan masuk ke akun Anda</p>

            {/* Login Success Notification Banner */}
            {loginSuccess && (
              <div className="kk-success-banner">
                <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '20px' }}>
                  check_circle
                </span>
                <span>Login Berhasil! Mengalihkan ke Dashboard...</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={formik.handleSubmit}>
              {/* Username Input */}
              <div className="kk-form-group">
                <label className="kk-label" htmlFor="username-input">
                  Email / Username
                </label>
                <div className="kk-input-wrap">
                  <span className="material-symbols-outlined kk-input-icon">person</span>
                  <input
                    id="username-input"
                    name="username"
                    type="text"
                    required
                    value={formik.values.username}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="Masukkan username Anda"
                    className="kk-input"
                    autoComplete="username"
                  />
                </div>
                {formik.touched.username && formik.errors.username && (
                  <div className="kk-error-msg">{formik.errors.username}</div>
                )}
              </div>

              {/* Password Input */}
              <div className="kk-form-group">
                <label className="kk-label" htmlFor="password-input">
                  Password
                </label>
                <div className="kk-input-wrap">
                  <span className="material-symbols-outlined kk-input-icon">lock</span>
                  <input
                    id="password-input"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="Masukkan password Anda"
                    className="kk-input has-eye"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    aria-label="Tampilkan atau sembunyikan kata sandi"
                    onClick={() => setShowPassword(!showPassword)}
                    className="kk-eye-btn"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {formik.touched.password && formik.errors.password && (
                  <div className="kk-error-msg">{formik.errors.password}</div>
                )}
              </div>

              {/* Options: Remember me & Forgot Password */}
              <div className="kk-form-options">
                <label className="kk-remember-label">
                  <input
                    type="checkbox"
                    name="remember_me"
                    checked={Boolean(formik.values.remember_me)}
                    onChange={formik.handleChange}
                    className="kk-remember-checkbox"
                  />
                  <span>Ingat Saya</span>
                </label>

                <a href="#" onClick={handleForgotPassword} className="kk-forgot-link">
                  Lupa password?
                </a>
              </div>

              {/* Submit Button with Smooth Scale Hover */}
              <button type="submit" disabled={state.load || loginSuccess} className="kk-submit-btn">
                {state.load ? (
                  <>
                    <span
                      className="material-symbols-outlined"
                      style={{ animation: 'spin 1s linear infinite', fontSize: '18px' }}
                    >
                      progress_activity
                    </span>
                    <span>Memproses Masuk...</span>
                  </>
                ) : loginSuccess ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      check
                    </span>
                    <span>Berhasil Masuk</span>
                  </>
                ) : (
                  <>
                    <span>Masuk</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}