import { useRef, useEffect } from "react";

export interface LogEntry {
    id: number;
    text: string;
    type: "info" | "success" | "error" | "warn";
    timestamp: string;
}

interface TerminalLogProps {
    logs: LogEntry[];
}

export default function TerminalLog({ logs }: TerminalLogProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const typeColor = (type: LogEntry["type"]) => {
        switch (type) {
            case "success": return "terminal-line-success";
            case "error": return "terminal-line-error";
            case "warn": return "terminal-line-warn";
            default: return "terminal-line-info";
        }
    };

    const typePrefix = (type: LogEntry["type"]) => {
        switch (type) {
            case "success": return "[✓]";
            case "error": return "[✗]";
            case "warn": return "[!]";
            default: return "[>]";
        }
    };

    const renderFormattedText = (text: string) => {
        // Highlight module tags like [1AM], [MIDNIGHT], [CONTRACT], [CRYPTO], [STEGO], [ZIP], [HASH], [AUTH], etc.
        const tagRegex = /^(\[(1AM|AUTH|CHAIN|CONTRACT|CRYPTO|HASH|MIDNIGHT|STEGO|ZIP|SUCCESS|VAULT|INFO|ERROR)\])(.*)$/;
        const match = text.match(tagRegex);

        if (!match) {
            return <span>{text}</span>;
        }

        const tag = match[1];
        const moduleName = match[2];
        const rest = match[3];

        let tagClass = "terminal-tag-default";
        if (moduleName === "1AM") tagClass = "terminal-tag-1am";
        else if (moduleName === "AUTH") tagClass = "terminal-tag-auth";
        else if (moduleName === "CHAIN") tagClass = "terminal-tag-chain";
        else if (moduleName === "CONTRACT") tagClass = "terminal-tag-contract";
        else if (moduleName === "CRYPTO") tagClass = "terminal-tag-crypto";
        else if (moduleName === "HASH") tagClass = "terminal-tag-crypto";
        else if (moduleName === "MIDNIGHT") tagClass = "terminal-tag-midnight";
        else if (moduleName === "STEGO") tagClass = "terminal-tag-stego";
        else if (moduleName === "ZIP") tagClass = "terminal-tag-zip";
        else if (moduleName === "SUCCESS") tagClass = "terminal-tag-success";
        else if (moduleName === "VAULT") tagClass = "terminal-tag-auth";
        else if (moduleName === "ERROR") tagClass = "terminal-tag-error";
        else if (moduleName === "INFO") tagClass = "terminal-tag-default";

        return (
            <span>
                <span className={`terminal-module-tag ${tagClass}`}>{tag}</span>
                {rest}
            </span>
        );
    };

    return (
        <div className="terminal-log">
            <div className="terminal-header">
                <div className="terminal-dots">
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                </div>
                <div className="terminal-title-bar">
                    <span className="terminal-title">midnight_audit_daemon.sh</span>
                    <span className="terminal-badge">MIDNIGHT PREPROD · 1AM WALLET</span>
                </div>
            </div>
            <div className="terminal-body">
                {logs.length === 0 && (
                    <div className="terminal-line text-gray-500">
                        <span className="terminal-prompt">$</span>
                        <span> Awaiting 1AM Wallet connection &amp; Midnight contract instructions…</span>
                    </div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className={`terminal-line ${typeColor(log.type)}`}>
                        <span className="terminal-time">{log.timestamp}</span>
                        <span className="terminal-prefix">{typePrefix(log.type)}</span>
                        <span> {renderFormattedText(log.text)}</span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
