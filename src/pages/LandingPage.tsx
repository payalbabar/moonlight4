import { useNavigate } from "react-router-dom";
import { use1AMWallet } from "../hooks/use1AMWallet";

export default function LandingPage() {
    const navigate = useNavigate();
    const { isConnected, account, isConnecting, connect, disconnect } = use1AMWallet();

    const handleLaunch = () => {
        navigate("/app");
    };

    const handleConnect = async () => {
        try {
            await connect();
        } catch {
            // error handled in context
        }
    };

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content fade-in">
                    <div className="hero-icon-wrapper">
                        <svg viewBox="0 0 100 100" className="hero-lock-icon">
                            <rect x="10" y="30" width="80" height="60" rx="8" className="lock-body" />
                            <circle cx="50" cy="55" r="10" className="lock-keyhole" />
                            <path d="M30 30V20a20 20 0 0 1 40 0v10" className="lock-shackle" />
                            <circle cx="50" cy="50" r="45" className="glow-circle" />
                        </svg>
                    </div>

                    <h1 className="hero-title">
                        <span className="gradient-text">STEGOVAULT</span>
                    </h1>

                    <p className="hero-subtitle">
                        1AM Wallet · Midnight Network · AES-256-GCM · LSB Steganography
                    </p>

                    <p className="hero-description">
                        Hide seed phrases and sensitive credentials inside ordinary images using <strong>AES-256-GCM authenticated encryption</strong>,{" "}
                        <strong>LSB steganography</strong>, and <strong>1AM Wallet on-chain commitments</strong>.
                        StegoVault processes your secret 100% locally in browser memory.
                    </p>

                    <div className="hero-badges">
                        <span className="badge-item">
                            <span className="badge-icon">⚡</span> 1AM Wallet
                        </span>
                        <span className="badge-item">
                            <span className="badge-icon">📜</span> Compact Contract
                        </span>
                        <span className="badge-item">
                            <span className="badge-icon">🔐</span> AES-256-GCM
                        </span>
                        <span className="badge-item">
                            <span className="badge-icon">🖼️</span> LSB Steganography
                        </span>
                        <span className="badge-item">
                            <span className="badge-icon">💻</span> 100% Client-Side
                        </span>
                    </div>

                    {/* 1AM Wallet connect panel on landing page */}
                    <div className="landing-wallet-panel">
                        {!isConnected ? (
                            <button
                                className="cta-button landing-wallet-btn"
                                onClick={handleConnect}
                                disabled={isConnecting}
                            >
                                {isConnecting ? (
                                    <span className="btn-loading">
                                        <span className="spinner" /> Connecting…
                                    </span>
                                ) : (
                                    <>
                                        <span className="wallet-btn-icon">⚡</span>
                                        <span className="cta-text">CONNECT 1AM WALLET</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="landing-wallet-connected">
                                <div className="landing-connected-info">
                                    <span className="landing-status-dot" />
                                    <span className="landing-connected-label">1AM Wallet Connected</span>
                                    <span className="landing-address">
                                        {account?.slice(0, 8)}...{account?.slice(-6)}
                                    </span>
                                </div>
                                <div className="landing-wallet-actions">
                                    <button className="cta-button" onClick={handleLaunch}>
                                        <span className="cta-text">LAUNCH STEGOVAULT</span>
                                        <span className="cta-arrow">→</span>
                                    </button>
                                    <button className="landing-disconnect-btn" onClick={disconnect}>
                                        Disconnect
                                    </button>
                                </div>
                            </div>
                        )}
                        {!isConnected && (
                            <p className="landing-wallet-note">
                                Exclusively designed for <strong>1AM Wallet</strong> on Midnight Preprod.
                                Connect 1AM Wallet to authorize and seal steganographic vaults.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-it-works">
                <h2 className="section-title">
                    <span className="title-line"></span>
                    HOW IT WORKS
                    <span className="title-line"></span>
                </h2>

                <div className="steps-grid">
                    <div className="step-card" style={{ animationDelay: "0.1s" }}>
                        <div className="step-number">01</div>
                        <div className="step-icon">⚡</div>
                        <h3 className="step-title">Connect 1AM Wallet</h3>
                        <p className="step-description">
                            Connect your <strong>1AM Wallet</strong> to authenticate your Midnight identity.
                            Every vault is cryptographically bound to your wallet.
                        </p>
                    </div>

                    <div className="step-card" style={{ animationDelay: "0.2s" }}>
                        <div className="step-number">02</div>
                        <div className="step-icon">🔒</div>
                        <h3 className="step-title">Encrypt &amp; Commit</h3>
                        <p className="step-description">
                            Your secret is encrypted locally with <strong>PBKDF2</strong> (100k iterations) and <strong>AES-256-GCM</strong>.
                            A non-sensitive commitment is recorded on the <strong>Compact smart contract</strong>.
                        </p>
                    </div>

                    <div className="step-card" style={{ animationDelay: "0.3s" }}>
                        <div className="step-number">03</div>
                        <div className="step-icon">🎨</div>
                        <h3 className="step-title">Hide in Plain Sight</h3>
                        <p className="step-description">
                            The encrypted payload is embedded into the <strong>blue channel LSB</strong> of
                            a lossless PNG image—completely imperceptible to the human eye.
                        </p>
                    </div>

                    <div className="step-card" style={{ animationDelay: "0.4s" }}>
                        <div className="step-number">04</div>
                        <div className="step-icon">🔓</div>
                        <h3 className="step-title">Verify &amp; Recover</h3>
                        <p className="step-description">
                            Connect the authorized 1AM Wallet, verify the on-chain commitment, enter your password, and
                            recover your secret in browser memory.
                        </p>
                    </div>
                </div>
            </section>

            {/* Security Architecture */}
            <section className="features-section">
                <h2 className="section-title">
                    <span className="title-line"></span>
                    THREE SECURITY LAYERS
                    <span className="title-line"></span>
                </h2>

                <div className="features-grid three-layers-grid">
                    <div className="feature-card layer-card layer-wallet">
                        <div className="layer-badge">LAYER 1</div>
                        <div className="feature-icon">⚡</div>
                        <h3 className="feature-title">Midnight &amp; 1AM Wallet</h3>
                        <p className="feature-text">
                            Zero-knowledge authorization and on-chain commitment binding via Compact smart contract.
                            No other wallet is supported.
                        </p>
                    </div>

                    <div className="feature-card layer-card layer-crypto">
                        <div className="layer-badge">LAYER 2</div>
                        <div className="feature-icon">🛡️</div>
                        <h3 className="feature-title">AES-256-GCM Encryption</h3>
                        <p className="feature-text">
                            PBKDF2 + AES-256-GCM authenticated encryption.
                            Your password and AES key never leave browser memory.
                        </p>
                    </div>

                    <div className="feature-card layer-card layer-stego">
                        <div className="layer-badge">LAYER 3</div>
                        <div className="feature-icon">👁️</div>
                        <h3 className="feature-title">PNG + LSB Steganography</h3>
                        <p className="feature-text">
                            The encrypted ciphertext is embedded in blue-channel pixel bits.
                            The vault appears as an ordinary photo for plausible deniability.
                        </p>
                    </div>
                </div>

                <div className="security-note">
                    <span className="security-note-icon">ℹ️</span>
                    StegoVault processes your secret locally in your browser and never sends sensitive data on-chain or to any server.
                    The Midnight Network stores only non-sensitive cryptographic commitments.
                </div>
            </section>

            {/* Features */}
            <section className="features-section features-section-secondary">
                <h2 className="section-title">
                    <span className="title-line"></span>
                    WHY STEGOVAULT?
                    <span className="title-line"></span>
                </h2>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">⚡</div>
                        <h3 className="feature-title">Zero Server Dependency</h3>
                        <p className="feature-text">
                            Everything runs locally in your browser using the native Web Crypto API.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🔗</div>
                        <h3 className="feature-title">Wallet-Bound Vaults</h3>
                        <p className="feature-text">
                            Each vault is cryptographically bound to your 1AM Wallet address on Midnight Preprod.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📱</div>
                        <h3 className="feature-title">Cross-Platform Responsive</h3>
                        <p className="feature-text">
                            Engineered for high usability across desktop, laptop, tablet, and mobile devices.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">⚠️</div>
                        <h3 className="feature-title">Lossless PNG Protection</h3>
                        <p className="feature-text">
                            Automatic rejection of lossy formats (JPEG, WebP) and ZIP bundling with instructions to protect hidden data.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📜</div>
                        <h3 className="feature-title">Compact Smart Contract</h3>
                        <p className="feature-text">
                            Record immutable timestamped commitments on the Midnight Network using privacy-first Compact circuits.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🌐</div>
                        <h3 className="feature-title">Auditable &amp; Open</h3>
                        <p className="feature-text">
                            Zero third-party proprietary dependencies in the crypto layer. Clean, reproducible, and verifiable.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2 className="cta-title">Ready to Secure Your Cold Storage?</h2>
                    <p className="cta-subtitle">
                        Connect your 1AM Wallet and take control of your seed phrases today.
                        No signups. No trackers. Pure cryptographic security.
                    </p>
                    {isConnected ? (
                        <button className="cta-button cta-button-large" onClick={handleLaunch}>
                            <span className="cta-text">LAUNCH STEGOVAULT</span>
                            <span className="cta-arrow">→</span>
                        </button>
                    ) : (
                        <button className="cta-button cta-button-large" onClick={handleConnect}>
                            <span className="wallet-btn-icon">⚡</span>
                            <span className="cta-text">CONNECT 1AM WALLET</span>
                        </button>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-logo">
                        <svg viewBox="0 0 40 40" className="footer-icon">
                            <rect x="4" y="4" width="32" height="32" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
                            <rect x="10" y="16" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
                            <circle cx="20" cy="23" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                            <path d="M14 16V12a6 6 0 0 1 12 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                        </svg>
                        <span>STEGOVAULT</span>
                    </div>
                    <p className="footer-text">
                        Your secrets, your 1AM Wallet, your control.
                    </p>
                    <p className="footer-copyright">
                        © 2026 StegoVault. Open Source. Client-Side Cryptography. Midnight Network &amp; 1AM Wallet Exclusive.
                    </p>
                </div>
            </footer>
        </div>
    );
}
