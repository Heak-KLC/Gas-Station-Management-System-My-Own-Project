// Plug into App.jsx: <Routes>{roleRoutes}</Routes>
import { Route, Navigate } from 'react-router-dom';
import RoleLayout from '../layouts/RoleLayout';
import ManagerSidebar from '../components/ManagerSidebar';     // <- your file
import CashierSidebar from '../components/CashierSidebar';     // <- your file
import AttendantSidebar from '../components/FuelAttendantSidebar';

import MDashboard from '../pages/manager/Dashboard';
import FuelTanks from '../pages/manager/FuelTanks';
import StoreInventory from '../pages/manager/StoreInventory';
import FuelPurchases from '../pages/manager/FuelPurchases';
import Suppliers from '../pages/manager/Suppliers';
import ShiftHandovers from '../pages/manager/ShiftHandovers';
import Attendance from '../pages/manager/Attendance';
import Maintenance from '../pages/manager/Maintenance';
import BranchReports from '../pages/manager/BranchReports';
import Notifications from '../pages/manager/Notifications';
import CDashboard from '../pages/cashier/Dashboard';
import POS from '../pages/cashier/POS';
import DailySales from '../pages/cashier/DailySales';
import Loyalty from '../pages/cashier/Loyalty';
import CShift from '../pages/cashier/ShiftHandover';
import ADashboard from '../pages/attendant/Dashboard';
import MyStation from '../pages/attendant/MyStation';
import MeterInput from '../pages/attendant/MeterInput';
import MaintenanceReport from '../pages/attendant/MaintenanceReport';

const user = (role) => ({ name: 'Sovan Dara', role }); // TODO: take from your auth state

export const roleRoutes = (
  <>
    <Route path="/manager" element={<RoleLayout Sidebar={ManagerSidebar} title="Dashboard" user={user('Manager')} />}>
      <Route index element={<MDashboard />} />
      <Route path="fuel-tanks" element={<FuelTanks />} />
      <Route path="pumps" element={<FuelTanks />} />
      <Route path="inventory" element={<StoreInventory />} />
      <Route path="purchases" element={<FuelPurchases />} />
      <Route path="suppliers" element={<Suppliers />} />
      <Route path="shift-handovers" element={<ShiftHandovers />} />
      <Route path="attendance" element={<Attendance />} />
      <Route path="maintenance" element={<Maintenance />} />
      <Route path="reports" element={<BranchReports />} />
      <Route path="notifications" element={<Notifications />} />
    </Route>
    <Route path="/cashier" element={<RoleLayout Sidebar={CashierSidebar} title="Dashboard" user={user('Cashier')} />}>
      <Route index element={<CDashboard />} />
      <Route path="pos" element={<POS />} />
      <Route path="daily-sales" element={<DailySales />} />
      <Route path="loyalty" element={<Loyalty />} />
      <Route path="shift-handover" element={<CShift />} />
    </Route>
    <Route path="/attendant" element={<RoleLayout Sidebar={AttendantSidebar} title="Dashboard" user={user('Fuel Attendant')} />}>
      <Route index element={<ADashboard />} />
      <Route path="station" element={<MyStation />} />
      <Route path="meter" element={<MeterInput />} />
      <Route path="maintenance-report" element={<MaintenanceReport />} />
    </Route>
  </>
);
