import { useContext } from "react";
import { WalletContext, type WalletContextType } from "../context/WalletContext";

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet / use1AMWallet must be used within a WalletProvider");
  }
  return context;
}

export function use1AMWallet(): WalletContextType {
  return useWallet();
}

export default use1AMWallet;
