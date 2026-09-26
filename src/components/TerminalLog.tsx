import { useRef, useEffect, useState } from "react";

export interface LogEntry {
    id: number;
    text: string;
    type: "info" | "success" | "error" | "warn";
    timestamp: string;
}

interface TerminalLogProps {
    logs: LogEntry[];
}

const MODULE_TAGS: Record<string, string> = {
    "1AM": "terminal-tag-1am", AUTH: "terminal-tag-auth", CHAIN: "terminal-tag-chain",
    CONTRACT: "terminal-tag-contract", COMPACT: "terminal-tag-contract",
    CRYPTO: "terminal-tag-crypto", HASH: "terminal-tag-crypto",
    MIDNIGHT: "terminal-tag-midnight", STEGO: "terminal-tag-stego",
    ZIP: "terminal-tag-zip", SUCCESS: "terminal-tag-success",
    VAULT: "terminal-tag-auth", ERROR: "terminal-tag-error", INFO: "terminal-tag-default",
};

function renderLine(text: string) {
    const match = text.match(/^(\[([A-Z0-9_]+)\])(.*)$/);
    if (!match) return <span>{text}</span>;
    const [, tag, mod, rest] = match;
    const cls = MODULE_TAGS[mod] ?? "terminal-tag-default";
    return <><span className={`terminal-module-tag ${cls}`}>{tag}</span><span>{rest}</span></>;
}

export default function TerminalLog({ logs }: TerminalLogProps) {
    const bodyRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        if (autoScroll && bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const handleScroll = () => {
        if (!bodyRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = bodyRef.current;
        setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
    };

    const typeClass = (t: LogEntry["type"]) => ({ success: "terminal-line-success", error: "terminal-line-error", warn: "terminal-line-warn", info: "terminal-line-info" })[t];
    const typePrefix = (t: LogEntry["type"]) => ({ success: "✓", error: "✗", warn: "!", info: "›" })[t];

    return (
        <div className="terminal-log">
            {/* Title bar */}
            <div className="terminal-header">
                <div className="terminal-dots">
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                </div>
                <div className="terminal-title-bar">
                    <span className="terminal-title">audit_daemon.sh</span>
                    <span className="terminal-badge">MIDNIGHT PREPROD</span>
                    {logs.length > 0 && (
                        <span style={{ marginLeft: "auto", fontSize: "0.62rem", color: "var(--text3)", fontFamily: "'JetBrains Mono',monospace" }}>
                            {logs.length} events
                        </span>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="terminal-body" ref={bodyRef} onScroll={handleScroll}>
                {logs.length === 0 ? (
                    <div className="terminal-line terminal-line-info" style={{ opacity: 0.45 }}>
                        <span className="terminal-prompt">$</span>
                        <span> Waiting for vault operations…</span>
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className={`terminal-line ${typeClass(log.type)}`}>
                            <span className="terminal-time">{log.timestamp}</span>
                            <span className="terminal-prefix" style={{ minWidth: 12, textAlign: "center" }}>{typePrefix(log.type)}</span>
                            <span>{renderLine(log.text)}</span>
                        </div>
                    ))
                )}
            </div>

            {/* Scroll-to-bottom hint */}
            {!autoScroll && logs.length > 0 && (
                <button
                    onClick={() => { if (bodyRef.current) { bodyRef.current.scrollTop = bodyRef.current.scrollHeight; setAutoScroll(true); } }}
                    style={{
                        position: "absolute", bottom: "0.625rem", right: "0.75rem",
                        background: "rgba(77,159,255,0.15)", border: "1px solid var(--info-border)",
                        borderRadius: "999px", color: "var(--blue)",
                        fontSize: "0.68rem", padding: "0.2rem 0.625rem", cursor: "pointer",
                        fontFamily: "'JetBrains Mono',monospace",
                    }}
                >
                    ↓ latest
                </button>
            )}
        </div>
    );
}
