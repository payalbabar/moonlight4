import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { use1AMWallet } from "../hooks/use1AMWallet";
import LockIcon from "../components/LockIcon";

export default function LandingPage() {
    const navigate = useNavigate();
    const { isConnected, account, isConnecting, connect, disconnect } = use1AMWallet();
    const heroRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = heroRef.current;
        if (!el) return;
        const t = setTimeout(() => el.classList.add("fade-in"), 60);
        return () => clearTimeout(t);
    }, []);

    const handleConnect = async () => {
        try { await connect(); } catch { /* handled in context */ }
    };

    const handleLaunch = () => navigate("/app");

    return (
        <div className="landing-page">

            {/* ── Nav ── */}
            <nav className="landing-nav" role="navigation" aria-label="Main navigation">
                <div className="landing-nav-inner">
                    <a href="/" className="nav-logo" aria-label="StegoVault home">
                        <span className="nav-logo-icon"><LockIcon /></span>
                        StegoVault
                    </a>
                    <div className="nav-actions">
                        <a
                            href="https://x.com/StegoVaultWeb3"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-social-pill"
                            title="Follow StegoVault on X (Twitter)"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0.35rem 0.75rem",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                color: "var(--text-secondary, #cbd5e1)",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                textDecoration: "none",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <span style={{ fontWeight: 700, fontSize: "0.8rem" }}>𝕏</span> @StegoVaultWeb3
                        </a>
                        <span className="nav-network-pill">
                            <span className="nav-dot" aria-hidden="true" />
                            Midnight Preprod
                        </span>
                        {isConnected ? (
                            <button className="btn-launch" onClick={handleLaunch}>
                                Open App →
                            </button>
                        ) : (
                            <button
                                className="connect-btn"
                                style={{ padding: "0.38rem 1rem", fontSize: "0.78rem" }}
                                onClick={handleConnect}
                                disabled={isConnecting}
                                aria-label="Connect 1AM Wallet"
                            >
                                {isConnecting
                                    ? <><span className="spinner" /> Connecting…</>
                                    : "Connect Wallet"
                                }
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="hero-section" aria-labelledby="hero-heading">
                {/* Animated bg blobs */}
                <div className="orb orb-1" aria-hidden="true" />
                <div className="orb orb-2" aria-hidden="true" />
                <div className="orb orb-3" aria-hidden="true" />
                <div className="hero-grid-overlay" aria-hidden="true" />

                <div className="hero-content" ref={heroRef}>

                    {/* Eyebrow */}
                    <span className="hero-eyebrow">
                        <span className="nav-dot" style={{ width: 6, height: 6 }} aria-hidden="true" />
                        Live on Midnight Preprod · 1AM Wallet
                    </span>

                    {/* Headline */}
                    <h1 className="hero-title" id="hero-heading">
                        Hide your secrets{" "}
                        <span className="hero-title-accent">inside ordinary images</span>
                    </h1>

                    {/* Sub */}
                    <p className="hero-description">
                        StegoVault encrypts seed phrases and private keys with <strong>AES-256-GCM</strong>,
                        binds each vault to your <strong>1AM Wallet identity on-chain</strong>, then conceals
                        the encrypted payload inside a PNG image using <strong>lossless LSB steganography</strong> — 100% in your browser.
                    </p>

                    {/* Tech badges */}
                    <div className="hero-tech-row" role="list" aria-label="Technology stack">
                        {[
                            { icon: "⚡", label: "1AM Wallet" },
                            { icon: "📜", label: "Compact Contract" },
                            { icon: "🔐", label: "AES-256-GCM" },
                            { icon: "🖼️", label: "LSB Steganography" },
                            { icon: "🌐", label: "100% Client-Side" },
                        ].map(({ icon, label }) => (
                            <span className="tech-badge" key={label} role="listitem">
                                <span className="tech-badge-icon" aria-hidden="true">{icon}</span>
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="hero-cta-group">
                        <div className="hero-wallet-area">
                            {isConnected ? (
                                <div className="connected-wallet-card">
                                    <div className="connected-wallet-info">
                                        <span className="connected-dot" aria-hidden="true" />
                                        <span className="connected-label">Connected</span>
                                        <span className="connected-address" title={account ?? ""}>
                                            {account?.slice(0, 8)}…{account?.slice(-6)}
                                        </span>
                                    </div>
                                    <div className="connected-actions">
                                        <button className="btn-launch" onClick={handleLaunch}>
                                            Launch App →
                                        </button>
                                        <button className="btn-disconnect-small" onClick={disconnect}>
                                            Disconnect
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="cta-primary"
                                    onClick={handleConnect}
                                    disabled={isConnecting}
                                    aria-label="Connect 1AM Wallet to get started"
                                >
                                    {isConnecting
                                        ? <><span className="spinner" /> Connecting to 1AM Wallet…</>
                                        : <><span aria-hidden="true">⚡</span> Connect 1AM Wallet</>
                                    }
                                </button>
                            )}
                        </div>
                        <p className="cta-note">
                            Requires the <strong>1AM Wallet</strong> browser extension on Midnight Preprod.
                            No signups. No trackers.
                        </p>
                    </div>

                    {/* Stats bar */}
                    <div className="hero-stats">
                        {[
                            { value: "AES-256", label: "Encryption standard" },
                            { value: "100k",    label: "PBKDF2 iterations" },
                            { value: "0 bytes", label: "Data sent to servers" },
                            { value: "100%",    label: "Client-side processing" },
                        ].map(({ value, label }) => (
                            <div className="hero-stat" key={label}>
                                <span className="hero-stat-value">{value}</span>
                                <div className="hero-stat-label">{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Visual product mockup */}
                    <div className="hero-mockup" aria-hidden="true">
                        <div className="mockup-bar">
                            <div className="mockup-dots">
                                <div className="mockup-dot mockup-dot-r" />
                                <div className="mockup-dot mockup-dot-y" />
                                <div className="mockup-dot mockup-dot-g" />
                            </div>
                            <div className="mockup-url">stegovault.app · Midnight Preprod</div>
                        </div>
                        <div className="mockup-body">
                            <div className="mockup-panel-row">
                                <div className="mockup-panel mockup-vault">
                                    <div className="mockup-panel-head">
                                        <span className="mockup-panel-icon">🔒</span>
                                        <span className="mockup-panel-title">THE VAULT</span>
                                    </div>
                                    <div className="mockup-line" />
                                    <div className="mockup-line mockup-line-short" />
                                    <div className="mockup-line" />
                                    <div className="mockup-btn" />
                                </div>
                                <div className="mockup-panel mockup-key">
                                    <div className="mockup-panel-head">
                                        <span className="mockup-panel-icon">🔓</span>
                                        <span className="mockup-panel-title">THE KEY</span>
                                    </div>
                                    <div className="mockup-line" />
                                    <div className="mockup-line mockup-line-short" />
                                    <div className="mockup-line" />
                                    <div className="mockup-btn mockup-btn-purple" />
                                </div>
                            </div>
                            <div className="mockup-terminal">
                                {[
                                    { color: "var(--green)",  w: "75%" },
                                    { color: "var(--blue)",   w: "55%" },
                                    { color: "var(--amber)",  w: "65%" },
                                    { color: "var(--green)",  w: "80%" },
                                ].map(({ color, w }, i) => (
                                    <div className="mockup-log-line" key={i}>
                                        <div className="mockup-log-dot" style={{ background: color }} />
                                        <div className="mockup-log-text" style={{ width: w, maxWidth: w }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section className="how-section" aria-labelledby="how-heading">
                <div className="section-inner">
                    <p className="section-label">
                        <span className="section-label-line" aria-hidden="true" />
                        HOW IT WORKS
                        <span className="section-label-line-r" aria-hidden="true" />
                    </p>
                    <h2 className="section-title" id="how-heading">
                        Four steps to unbreakable cold storage
                    </h2>
                    <p className="section-subtitle">
                        From wallet connection to a steganographic vault — every step happens locally in your browser.
                    </p>

                    <div className="steps-grid">
                        {[
                            {
                                n: "01", icon: "⚡", title: "Connect 1AM Wallet",
                                desc: "Authenticate your Midnight identity. Every vault is cryptographically bound to your 1AM Wallet — no other wallet is supported.",
                            },
                            {
                                n: "02", icon: "🔒", title: "Encrypt Locally",
                                desc: "Your secret is encrypted in-browser with PBKDF2 (100k iterations) + AES-256-GCM. The key never leaves your machine.",
                            },
                            {
                                n: "03", icon: "📜", title: "Commit On-Chain",
                                desc: "A non-sensitive SHA-256 hash is recorded on the Midnight Compact smart contract. Only the hash — never your secret.",
                            },
                            {
                                n: "04", icon: "🖼️", title: "Hide in Plain Sight",
                                desc: "The encrypted payload is embedded into the blue-channel LSBs of a lossless PNG — visually identical to the original.",
                            },
                        ].map(({ n, icon, title, desc }, i) => (
                            <article
                                className="step-card"
                                key={n}
                                aria-label={`Step ${n}: ${title}`}
                                style={{ animationDelay: `${i * 0.07}s` }}
                            >
                                <div className="step-num">STEP {n}</div>
                                <div className="step-icon-wrap" aria-hidden="true">{icon}</div>
                                <h3 className="step-title">{title}</h3>
                                <p className="step-description">{desc}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Security Layers ── */}
            <section className="security-section" aria-labelledby="security-heading">
                <div className="section-inner">
                    <p className="section-label">
                        <span className="section-label-line" aria-hidden="true" />
                        SECURITY MODEL
                        <span className="section-label-line-r" aria-hidden="true" />
                    </p>
                    <h2 className="section-title" id="security-heading">
                        Three independent security layers
                    </h2>
                    <p className="section-subtitle">
                        Even if one layer is compromised, the others independently protect your secret.
                    </p>

                    <div className="layers-grid">
                        {[
                            {
                                cls: "layer-1", badge: "LAYER 1", icon: "⚡",
                                title: "Midnight & 1AM Wallet",
                                desc: "Zero-knowledge authorization and on-chain vault commitment binding via the Midnight Compact smart contract. Your wallet identity is the key to your vault.",
                            },
                            {
                                cls: "layer-2", badge: "LAYER 2", icon: "🛡️",
                                title: "AES-256-GCM Encryption",
                                desc: "PBKDF2 with 100,000 iterations derives a 256-bit AES key from your password. The key and plaintext never leave browser memory.",
                            },
                            {
                                cls: "layer-3", badge: "LAYER 3", icon: "👁️",
                                title: "PNG LSB Steganography",
                                desc: "The ciphertext is embedded in the least-significant bits of blue-channel pixels. The vault appears as an ordinary photo for plausible deniability.",
                            },
                        ].map(({ cls, badge, icon, title, desc }) => (
                            <article className={`layer-card ${cls}`} key={title}>
                                <span className="layer-badge">{badge}</span>
                                <div className="layer-icon" aria-hidden="true">{icon}</div>
                                <h3 className="layer-title">{title}</h3>
                                <p className="layer-desc">{desc}</p>
                            </article>
                        ))}
                    </div>

                    <div className="privacy-note" role="note">
                        <span className="privacy-note-icon" aria-hidden="true">🔍</span>
                        <span>
                            <strong>What goes on-chain:</strong> only a 32-byte vault ID and a SHA-256 ciphertext
                            commitment. <strong>Passwords, seed phrases, AES keys, and image data never leave your browser</strong> — not to
                            any server, not to the Midnight Network.
                        </span>
                    </div>
                </div>
            </section>

            {/* ── Why StegoVault ── */}
            <section className="why-section" aria-labelledby="why-heading">
                <div className="section-inner">
                    <p className="section-label">
                        <span className="section-label-line" aria-hidden="true" />
                        WHY STEGOVAULT
                        <span className="section-label-line-r" aria-hidden="true" />
                    </p>
                    <h2 className="section-title" id="why-heading">
                        Built for real security, not theater
                    </h2>
                    <p className="section-subtitle">
                        Every design decision in StegoVault minimizes the attack surface.
                    </p>

                    <div className="features-grid">
                        {[
                            { icon: "🖥️", title: "Zero Server Dependency", text: "Everything runs via the native Web Crypto API in your browser. No backend, no cloud, no data retention." },
                            { icon: "🔗", title: "Wallet-Bound Vaults", text: "Each vault is cryptographically bound to your 1AM Wallet address. Another wallet cannot decrypt your vault." },
                            { icon: "📷", title: "Lossless PNG-Only", text: "StegoVault rejects JPEG, WebP, and all lossy formats that would silently corrupt the hidden payload." },
                            { icon: "📜", title: "Compact Smart Contract", text: "A Midnight-native Compact contract records immutable commitments on Preprod. Auditable and privacy-preserving." },
                            { icon: "📱", title: "Fully Responsive", text: "Designed for desktop, laptop, tablet, and mobile. Vault management wherever you are." },
                            { icon: "🌐", title: "Open & Auditable", text: "Zero proprietary crypto dependencies. Web Crypto API only. Every line of code is open for inspection." },
                        ].map(({ icon, title, text }) => (
                            <article className="feature-card" key={title}>
                                <div className="feature-icon-wrap" aria-hidden="true">{icon}</div>
                                <h3 className="feature-title">{title}</h3>
                                <p className="feature-text">{text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="cta-section" aria-labelledby="cta-heading">
                <div className="cta-section-inner">
                    <h2 className="cta-section-title" id="cta-heading">
                        Ready to secure your cold storage?
                    </h2>
                    <p className="cta-section-sub">
                        Connect your 1AM Wallet and create your first steganographic vault.
                        No signups. No trackers. Pure cryptographic security.
                    </p>
                    <div className="cta-btn-wrapper">
                        {isConnected ? (
                            <button className="cta-primary-large" onClick={handleLaunch}>
                                <span aria-hidden="true">🔐</span> Launch StegoVault →
                            </button>
                        ) : (
                            <button className="cta-primary-large" onClick={handleConnect} disabled={isConnecting}>
                                {isConnecting
                                    ? <><span className="spinner" /> Connecting…</>
                                    : <><span aria-hidden="true">⚡</span> Connect 1AM Wallet</>
                                }
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer" role="contentinfo">
                <div className="landing-footer-inner">
                    <div className="footer-logo">
                        <span className="footer-logo-icon"><LockIcon /></span>
                        STEGOVAULT
                    </div>
                    <p className="footer-tagline">Your secrets. Your wallet. Your control.</p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", margin: "0.75rem 0", flexWrap: "wrap" }}>
                        <a
                            href="https://x.com/StegoVaultWeb3"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--accent-purple, #a855f7)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}
                        >
                            𝕏 @StegoVaultWeb3
                        </a>
                        <span style={{ opacity: 0.3 }}>·</span>
                        <a
                            href="https://github.com/payalbabar/moonlight4"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--text-secondary, #94a3b8)", textDecoration: "none", fontSize: "0.85rem" }}
                        >
                            GitHub Repository
                        </a>
                    </div>
                    <p className="footer-copyright">
                        © 2026 StegoVault — MIT License · Midnight Network · 1AM Wallet · Client-Side Only
                    </p>
                </div>
            </footer>
        </div>
    );
}
