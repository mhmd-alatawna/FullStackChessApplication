import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function AppLayout() {
  return (
    <div className="application-shell">
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
}
