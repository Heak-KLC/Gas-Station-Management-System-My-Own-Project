import { useEffect, useState } from "react";
import api from "./api/axios";
import TopBar from "./components/TopBar";
import Login from "./components/login";

import AdminSidebar from "./components/AdminSidebar";
import ManagerSidebar from "./components/ManagerSidebar";
import CashierSidebar from "./components/CashierSidebar";
import FuelAttendantSidebar from "./components/FuelAttendantSidebar";

// ---------- Admin pages (existing) ----------
import Dashboard from "./pages/Dashboard";
import FuelManagement from "./pages/FuelManagement";
import FuelTanks from "./pages/FuelTanks";
import FuelPumps from "./pages/FuelPumps";
import ConvenienceStore from "./pages/ConvenienceStore";
import POSSalesHistory from "./pages/POSSalesHistory";
import SuppliersPurchases from "./pages/SuppliersPurchases";
import CustomerLoyalty from "./pages/CustomerLoyalty";
import EmployeeAttendance from "./pages/EmployeeAttendance";
import EquipmentMaintenance from "./pages/EquipmentMaintenance";
import MasterReports from "./pages/MasterReports";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

// ---------- Manager pages ----------
import MgrDashboard from "./pages/manager/Dashboard";
import MgrFuelTanks from "./pages/manager/FuelTanks";
import MgrPumpsStatus from "./pages/manager/PumpsStatus";
import MgrStoreInventory from "./pages/manager/StoreInventory";
import MgrFuelPurchases from "./pages/manager/FuelPurchases";
import MgrSuppliers from "./pages/manager/Suppliers";
import MgrShiftHandovers from "./pages/manager/ShiftHandovers";
import MgrAttendance from "./pages/manager/Attendance";
import MgrMaintenance from "./pages/manager/Maintenance";
import MgrBranchReports from "./pages/manager/BranchReports";
import MgrNotifications from "./pages/manager/Notifications";

// ---------- Cashier pages ----------
import CashDashboard from "./pages/cashier/Dashboard";
import CashPOS from "./pages/cashier/POS";
import CashDailySales from "./pages/cashier/DailySales";
import CashLoyalty from "./pages/cashier/Loyalty";
import CashShiftHandover from "./pages/cashier/ShiftHandover";

// ---------- Fuel Attendant pages ----------
import AttDashboard from "./pages/attendant/Dashboard";
import AttMyStation from "./pages/attendant/MyStation";
import AttMeterInput from "./pages/attendant/MeterInput";
import AttMaintenanceReport from "./pages/attendant/MaintenanceReport";


// ==================================================
// Pages per role
// ==================================================
// The keys here must match the IDs used by the
// corresponding Sidebar components.
const ROLES = {

  // ==================================================
  // ADMIN
  // ==================================================
  admin: {
    Sidebar: AdminSidebar,

    pages: {
      dashboard: {
        title: "Dashboard",
        Component: Dashboard,
      },

      "fuel-management": {
        title: "Fuel Management",
        Component: FuelManagement,
      },

      "fuel-tanks": {
        title: "Fuel Tanks",
        Component: FuelTanks,
      },

      "fuel-pumps": {
        title: "Fuel Pumps",
        Component: FuelPumps,
      },

      "convenience-store": {
        title: "Convenience Store",
        Component: ConvenienceStore,
      },

      "pos-sales-history": {
        title: "POS & Sales History",
        Component: POSSalesHistory,
      },

      "suppliers-purchases": {
        title: "Suppliers & Purchases",
        Component: SuppliersPurchases,
      },

      "customer-loyalty": {
        title: "Customer & Loyalty",
        Component: CustomerLoyalty,
      },

      "employee-attendance": {
        title: "Employee & Attendance",
        Component: EmployeeAttendance,
      },

      "equipment-maintenance": {
        title: "Equipment Maintenance",
        Component: EquipmentMaintenance,
      },

      "master-reports": {
        title: "Master Reports",
        Component: MasterReports,
      },

      notifications: {
        title: "Notifications",
        Component: Notifications,
      },

      settings: {
        title: "Settings",
        Component: Settings,
      },
    },
  },


  // ==================================================
  // MANAGER
  // ==================================================
  manager: {
    Sidebar: ManagerSidebar,

    pages: {
      dashboard: {
        title: "Dashboard",
        Component: MgrDashboard,
      },

      "fuel-and-tank-monitoring": {
        title: "Fuel & Tank Monitoring",
        Component: MgrFuelTanks,
      },

      "pumps-status": {
        title: "Pumps & Status",
        Component: MgrPumpsStatus,
      },

      "store-inventory": {
        title: "Store Inventory",
        Component: MgrStoreInventory,
      },

      "fuel-purchases": {
        title: "Fuel Purchases",
        Component: MgrFuelPurchases,
      },

      suppliers: {
        title: "Suppliers",
        Component: MgrSuppliers,
      },

      "shift-handovers": {
        title: "Shift Handovers",
        Component: MgrShiftHandovers,
      },

      "employees-and-attendance": {
        title: "Employees & Attendance",
        Component: MgrAttendance,
      },

      "equipment-maintenance": {
        title: "Equipment Maintenance",
        Component: MgrMaintenance,
      },

      "branch-reports": {
        title: "Branch Reports",
        Component: MgrBranchReports,
      },

      notifications: {
        title: "Notifications",
        Component: MgrNotifications,
      },
    },
  },


  // ==================================================
  // CASHIER
  // ==================================================
  cashier: {
    Sidebar: CashierSidebar,

    pages: {
      dashboard: {
        title: "Dashboard",
        Component: CashDashboard,
      },

      "pos-terminal": {
        title: "POS Terminal",
        Component: CashPOS,
      },

      "daily-sales-and-refunds": {
        title: "Daily Sales & Refunds",
        Component: CashDailySales,
      },

      "customer-loyalty-search": {
        title: "Customer Loyalty Search",
        Component: CashLoyalty,
      },

      "shift-handover": {
        title: "Shift Handover",
        Component: CashShiftHandover,
      },
    },
  },


  // ==================================================
  // FUEL ATTENDANT
  // ==================================================
  attendant: {
    Sidebar: FuelAttendantSidebar,

    pages: {
      dashboard: {
        title: "Dashboard",
        Component: AttDashboard,
      },

      "my-station-and-pumps": {
        title: "My Station / Pumps",
        Component: AttMyStation,
      },

      "fuel-dispense-and-meter-input": {
        title: "Fuel Dispense & Meter Input",
        Component: AttMeterInput,
      },

      "maintenance-report": {
        title: "Maintenance Report",
        Component: AttMaintenanceReport,
      },
    },
  },
};


// ==================================================
// APP COMPONENT
// ==================================================
export default function App() {

  // --------------------------------------------------
  // Store the currently logged-in user.
  //
  // null = Login page
  // object = authenticated user
  // --------------------------------------------------
  const [user, setUser] = useState(null);


  // --------------------------------------------------
  // Store the currently selected page.
  //
  // Dashboard is the default page.
  // --------------------------------------------------
  const [active, setActive] = useState("dashboard");


  // --------------------------------------------------
  // Track whether Laravel is checking the current
  // authentication session.
  //
  // React state is reset when the page is refreshed.
  // Therefore we need to check sessionStorage and
  // ask Laravel to verify the Sanctum token.
  // --------------------------------------------------
  const [checkingSession, setCheckingSession] = useState(true);


  // ==================================================
  // RESTORE SESSION AFTER REFRESH
  // ==================================================
  // This useEffect runs once when the React application
  // starts.
  //
  // IMPORTANT:
  // We use sessionStorage instead of localStorage.
  //
  // Therefore:
  //
  // Refresh page
  //      ↓
  // Token still exists in sessionStorage
  //      ↓
  // React calls GET /user
  //      ↓
  // Laravel verifies Sanctum token
  //      ↓
  // User is restored
  //      ↓
  // Dashboard remains accessible
  // ==================================================
  useEffect(() => {

    // ------------------------------------------------
    // Get the Sanctum token from the current browser
    // session.
    // ------------------------------------------------
    const token = sessionStorage.getItem(
      "gas_station_token"
    );


    // ------------------------------------------------
    // If there is no token, the user is not logged in.
    // ------------------------------------------------
    if (!token) {

      setCheckingSession(false);

      return;
    }


    // ------------------------------------------------
    // Ask Laravel who the authenticated user is.
    //
    // axios.js automatically attaches:
    //
    // Authorization: Bearer <token>
    // ------------------------------------------------
    api.get("/user")

      .then((response) => {

        // Laravel returns the authenticated user.
        const userData = response.data;


        // ------------------------------------------------
        // Normalize Laravel role to React role.
        //
        // Laravel database:
        // "fuel_attendant"
        //
        // React ROLES:
        // "attendant"
        // ------------------------------------------------
        const normalizedRole =
          userData.role === "fuel_attendant"
            ? "attendant"
            : userData.role;


        // ------------------------------------------------
        // Restore the authenticated user into React state.
        // ------------------------------------------------
        setUser({
          ...userData,
          role: normalizedRole,
        });


        // ------------------------------------------------
        // After refresh, start from Dashboard.
        // ------------------------------------------------
        setActive("dashboard");
      })

      .catch((error) => {

        // ------------------------------------------------
        // If Laravel says the token is invalid or the
        // account is unauthorized, remove the token.
        //
        // This can happen when:
        //
        // 1. The user logged out.
        // 2. Another session logged out the same user.
        // 3. The token is invalid.
        // 4. The token is no longer accepted by Laravel.
        // ------------------------------------------------
        if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {

          sessionStorage.removeItem(
            "gas_station_token"
          );
        }


        // Log the error for debugging.
        console.error(
          "Session restore failed:",
          error
        );


        // Clear the React authentication state.
        setUser(null);
      })

      .finally(() => {

        // ------------------------------------------------
        // Laravel has finished checking the session.
        // The application can now show Login or Dashboard.
        // ------------------------------------------------
        setCheckingSession(false);
      });

  }, []);


  // ==================================================
  // HANDLE LOGIN
  // ==================================================
  // Login.jsx sends the user information returned
  // by Laravel after successful authentication.
  // ==================================================
  const handleLogin = (userData) => {

    // ------------------------------------------------
    // Make sure Laravel returned user information.
    // ------------------------------------------------
    if (!userData) {

      alert(
        "User information was not received."
      );

      return false;
    }


    // ------------------------------------------------
    // Normalize the backend role.
    //
    // Laravel:
    // fuel_attendant
    //
    // React:
    // attendant
    // ------------------------------------------------
    const normalizedRole =
      userData.role === "fuel_attendant"
        ? "attendant"
        : userData.role;


    // ------------------------------------------------
    // Create the user object used by React.
    // ------------------------------------------------
    const loggedInUser = {
      ...userData,
      role: normalizedRole,
    };


    // ------------------------------------------------
    // Store the authenticated user in React state.
    // ------------------------------------------------
    setUser(loggedInUser);


    // ------------------------------------------------
    // Always start at Dashboard after login.
    // ------------------------------------------------
    setActive("dashboard");


    return true;
  };


  // ==================================================
  // HANDLE LOGOUT
  // ==================================================
  // Logout has TWO parts:
  //
  // 1. Backend logout
  //    Laravel deletes ALL Sanctum tokens belonging
  //    to the current user.
  //
  // 2. Frontend logout
  //    Remove the token from sessionStorage and clear
  //    the React user state.
  // ==================================================
  const handleLogout = async () => {

    // ------------------------------------------------
    // Ask the user to confirm logout.
    // ------------------------------------------------
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );


    // ------------------------------------------------
    // Stop if the user clicks Cancel.
    // ------------------------------------------------
    if (!confirmed) {
      return;
    }


    try {

      // ------------------------------------------------
      // Send logout request to Laravel.
      //
      // axios.js automatically adds:
      //
      // Authorization: Bearer <token>
      //
      // Laravel identifies the current user and
      // deletes ALL tokens belonging to that user.
      // ------------------------------------------------
      await api.post("/logout");


      console.log(
        "Logout successful."
      );

    } catch (error) {

      // ------------------------------------------------
      // Even if the API request fails, remove the local
      // token and clear the React session.
      //
      // This prevents the current browser from
      // continuing to use the frontend session.
      // ------------------------------------------------
      console.error(
        "Logout API error:",
        error
      );

    } finally {

      // ------------------------------------------------
      // Remove the authentication token from the
      // CURRENT browser session.
      //
      // IMPORTANT:
      // Use sessionStorage, NOT localStorage.
      // ------------------------------------------------
      sessionStorage.removeItem(
        "gas_station_token"
      );


      // ------------------------------------------------
      // Clear the logged-in user from React state.
      // ------------------------------------------------
      setUser(null);


      // ------------------------------------------------
      // Reset the active page.
      // ------------------------------------------------
      setActive("dashboard");
    }
  };


  // ==================================================
  // WAIT FOR SESSION CHECK
  // ==================================================
  // When React first starts, we do not immediately
  // show Login.
  //
  // We first wait for GET /user to finish.
  //
  // This prevents:
  //
  // Refresh
  //   ↓
  // Login appears temporarily
  //   ↓
  // Dashboard
  //
  // Instead, we wait until authentication is checked.
  // ==================================================
  if (checkingSession) {
    return null;
  }


  // ==================================================
  // SHOW LOGIN
  // ==================================================
  // If there is no authenticated user,
  // display Login.jsx.
  // ==================================================
  if (!user) {
    return (
      <Login onLogin={handleLogin} />
    );
  }


  // ==================================================
  // GET SIDEBAR AND PAGES FOR CURRENT ROLE
  // ==================================================
  // Example:
  //
  // admin
  //     → AdminSidebar
  //
  // manager
  //     → ManagerSidebar
  //
  // cashier
  //     → CashierSidebar
  //
  // attendant
  //     → FuelAttendantSidebar
  // ==================================================
  const { Sidebar, pages } = ROLES[user.role];


  // --------------------------------------------------
  // Get the currently selected page.
  //
  // If the selected page does not exist,
  // Dashboard is used as the fallback.
  // --------------------------------------------------
  const { title, Component } =
    pages[active] ?? pages.dashboard;


  // ==================================================
  // AUTHENTICATED APPLICATION LAYOUT
  // ==================================================
  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans">

      {/* ------------------------------------------------
          Sidebar

          Props:
          active     → current selected menu
          onNavigate → change page
          onLogout   → logout function
         ------------------------------------------------ */}
      <Sidebar
        active={active}
        onNavigate={setActive}
        onLogout={handleLogout}
      />


      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ------------------------------------------------
            Top navigation/header
           ------------------------------------------------ */}
        <TopBar title={title} />


        {/* ------------------------------------------------
            Main page content
           ------------------------------------------------ */}
        <main className="flex-1 overflow-y-auto">

          {/* ------------------------------------------------
              Admin pages keep the existing layout.

              Other roles use p-6 padding.
             ------------------------------------------------ */}
          <div
            className={
              user.role === "admin"
                ? ""
                : "p-6"
            }
          >

            {/* ------------------------------------------------
                Render the currently selected page.

                onNavigate allows Dashboard quick-action
                buttons to navigate to another page.
               ------------------------------------------------ */}
            <Component
              onNavigate={setActive}
            />

          </div>
        </main>

      </div>
    </div>
  );
}