import React, { useState } from "react";
import Sidebar from "./components/Sidebar";

export default function SimpleSidebarTest() {
  // ១. បង្កើត State សម្រាប់ចាំមើលថាអ្នកប្រើប្រាស់ចុចលើម៉ឺនុយណា
  // ដោយកំណត់តម្លៃដើមឱ្យវាទៅជា "dashboard"
  const [activeMenu, setActiveMenu] = useState("dashboard");

  // ២. បង្កើត Function សម្រាប់ដោះស្រាយពេលមានការចុចលើម៉ឺនុយ
  function handleNavigation(menuKey) {
    // ផ្លាស់ប្តូរតម្លៃ State ទៅតាមម៉ឺនុយដែលបានចុច
    setActiveMenu(menuKey);
    
    // បង្ហាញដំណឹងក្នុង Console ងាយស្រួលសម្រាប់មើលដឹងថាវាដើរឬអត់
    console.log("បានចុចលើម៉ឺនុយ៖", menuKey);
  }

  return (
    // ៣. បង្កើតប្រអប់បង្ហាញ Sidebar ធម្មតា
    <div className="flex h-screen w-60 bg-slate-900">
      
      {/* ទាញយក Sidebar មកប្រើប្រាស់ដោយបញ្ជូន Props ពីរចូល */}
      <Sidebar 
        active={activeMenu} 
        onNavigate={handleNavigation} 
      />

    </div>
  );
}