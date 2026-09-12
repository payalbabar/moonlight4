import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import LandingPage from "./pages/LandingPage";
import VaultApp from "./pages/VaultApp";

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<VaultApp />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
