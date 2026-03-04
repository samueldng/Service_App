import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import ClientsPage from './pages/dashboard/ClientsPage';
import SectorsPage from './pages/dashboard/SectorsPage';
import EquipmentPage from './pages/dashboard/EquipmentPage';
import ServiceOrdersPage from './pages/dashboard/ServiceOrdersPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import PublicEquipmentPage from './pages/PublicEquipmentPage';
import ClientPortalPage from './pages/ClientPortalPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/e/:qrCodeUid" element={<PublicEquipmentPage />} />
        <Route path="/portal/:clientId" element={<ClientPortalPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="sectors" element={<SectorsPage />} />
          <Route path="equipment" element={<EquipmentPage />} />
          <Route path="service-orders" element={<ServiceOrdersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
