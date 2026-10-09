
import api from "./axios";

// =====================================================
// EMPLOYEE API
// ហៅ Laravel API សម្រាប់គ្រប់គ្រងព័ត៌មានបុគ្គលិក
// =====================================================

export const getEmployees = async (params = {}) => {
  const response = await api.get("/employees", { params });
  return response.data.data;
};

export const getEmployee = async (id) => {
  const response = await api.get(`/employees/${id}`);
  return response.data.data;
};

export const createEmployee = async (employeeData) => {
  const response = await api.post("/employees", employeeData);
  return response.data;
};

export const updateEmployee = async (id, employeeData) => {
  const response = await api.put(`/employees/${id}`, employeeData);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await api.delete(`/employees/${id}`);
  return response.data;
};


// =====================================================
// EMPLOYEE ATTENDANCE API
// ហៅ Laravel API សម្រាប់គ្រប់គ្រងវត្តមាន
// =====================================================

export const getAttendances = async (params = {}) => {
  const response = await api.get("/employee-attendances", { params });
  return response.data.data;
};

export const getAttendance = async (id) => {
  const response = await api.get(`/employee-attendances/${id}`);
  return response.data.data;
};

export const createAttendance = async (attendanceData) => {
  const response = await api.post(
    "/employee-attendances",
    attendanceData
  );
  return response.data;
};

export const updateAttendance = async (id, attendanceData) => {
  const response = await api.put(
    `/employee-attendances/${id}`,
    attendanceData
  );
  return response.data;
};

export const deleteAttendance = async (id) => {
  const response = await api.delete(`/employee-attendances/${id}`);
  return response.data;
};


  
// =====================================================
// WORK SCHEDULE API
// ហៅ Laravel API សម្រាប់គ្រប់គ្រងកាលវិភាគការងារ
// =====================================================

// ទាញយកកាលវិភាគទាំងអស់ ឬស្វែងរកតាមលក្ខខណ្ឌ
export const getWorkSchedules = async (params = {}) => {
  const response = await api.get("/work-schedules", { params });
  return response.data.data;
};

// បង្កើតកាលវិភាគការងារថ្មី
export const createWorkSchedule = async (scheduleData) => {
  const response = await api.post("/work-schedules", scheduleData);
  return response.data;
};

// កែប្រែកាលវិភាគការងារដែលមានស្រាប់
export const updateWorkSchedule = async (id, scheduleData) => {
  const response = await api.put(`/work-schedules/${id}`, scheduleData);
  return response.data;
};

// លុបកាលវិភាគការងារ
export const deleteWorkSchedule = async (id) => {
  const response = await api.delete(`/work-schedules/${id}`);
  return response.data;
};


// =====================================================
// SYSTEM SETTINGS API
// ហៅ Laravel API សម្រាប់ការកំណត់ប្រព័ន្ធ
// =====================================================

// ទាញយកការកំណត់ប្រព័ន្ធពី Database
export const getSystemSettings = async () => {
  const response = await api.get("/system-settings");
  return response.data.data;
};

// រក្សាទុកការកំណត់ប្រព័ន្ធទៅ Database
export const updateSystemSettings = async (settingsData) => {
  const response = await api.put("/system-settings", settingsData);
  return response.data;
};