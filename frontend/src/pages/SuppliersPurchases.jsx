import React, { useEffect, useMemo, useState } from "react";
import {
  FilePlus,
  Truck,
  ShieldCheck,
  FileBarChart,
  Clock,
  ArrowUpRight,
  X,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { Panel, StatusBadge } from "../components/ui";

// =====================================================
// AXIOS
// =====================================================
// Used for Fuel Types API.
// The shared axios instance automatically adds
// the Sanctum Bearer Token from sessionStorage.
// =====================================================
import api from "../api/axios";

// =====================================================
// SUPPLIER API
// =====================================================
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../api/supplierApi";

// =====================================================
// PURCHASE ORDER API
// =====================================================
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from "../api/purchaseOrderApi";


// =====================================================
// STATIC DASHBOARD DATA
// =====================================================
// These sections are still UI/demo data.
// They are NOT connected to backend yet.
// =====================================================

const scorecard = [
  { grade: "A", pct: 60, color: "#10b981" },
  { grade: "B", pct: 30, color: "#f59e0b" },
  { grade: "C", pct: 10, color: "#ef4444" },
];

const ageing = [
  { bucket: "0-30 days", value: 5000 },
  { bucket: "31-60 days", value: 3200 },
  { bucket: "60+ days", value: 1500 },
];

const initialDeliveryLog = [
  {
    po: "19817032",
    date: "2025-05-23",
    supplier: "PTT Cambodia Co.",
    fuel: "Diesel",
    volOrd: "5,000",
    volRcv: "4,970",
    variance: "-0.6%",
    status: "OK",
  },
  {
    po: "19817033",
    date: "2025-05-23",
    supplier: "Sesamy San",
    fuel: "Diesel",
    volOrd: "5,000",
    volRcv: "5,000",
    variance: "0%",
    status: "OK",
  },
  {
    po: "19817034",
    date: "2025-05-23",
    supplier: "Caltex Cambodia",
    fuel: "Diesel",
    volOrd: "5,000",
    volRcv: "4,910",
    variance: "-1.8%",
    status: "Flag",
  },
  {
    po: "19817035",
    date: "2025-05-23",
    supplier: "Total Fuel Trading",
    fuel: "Diesel",
    volOrd: "5,000",
    volRcv: "5,000",
    variance: "0%",
    status: "OK",
  },
];


// =====================================================
// MAIN COMPONENT
// =====================================================

export default function SuppliersPurchases() {

  // ===================================================
  // PURCHASE ORDER STATE
  // ===================================================
  // IMPORTANT:
  // Purchase Orders are now loaded from Laravel/MySQL.
  // We no longer use initialPurchaseOrders as the main
  // Purchase Order data source.
  // ===================================================

  const [purchaseOrders, setPurchaseOrders] =
    useState([]);

  const [loadingPurchaseOrders, setLoadingPurchaseOrders] =
    useState(true);

  const [purchaseOrderError, setPurchaseOrderError] =
    useState("");

  const [savingPO, setSavingPO] =
    useState(false);

  const [deletingPOId, setDeletingPOId] =
    useState(null);


  // ===================================================
  // DELIVERY LOG STATE
  // ===================================================
  // Still local/demo data because Delivery Log backend
  // has not been implemented yet.
  // ===================================================

  const [deliveryLog, setDeliveryLog] =
    useState(initialDeliveryLog);


  // ===================================================
  // SUPPLIER STATE
  // ===================================================

  const [suppliers, setSuppliers] =
    useState([]);

  const [loadingSuppliers, setLoadingSuppliers] =
    useState(true);

  const [supplierError, setSupplierError] =
    useState("");

  const [supplierSearch, setSupplierSearch] =
    useState("");

  const [supplierStatus, setSupplierStatus] =
    useState("All");


  // ===================================================
  // FUEL TYPE STATE
  // ===================================================
  // Purchase Order requires fuel_id.
  // Therefore we load available fuel types from Laravel.
  // ===================================================

  const [fuelTypes, setFuelTypes] =
    useState([]);

  const [loadingFuelTypes, setLoadingFuelTypes] =
    useState(true);

  const [fuelTypeError, setFuelTypeError] =
    useState("");


  // ===================================================
  // MODAL STATE
  // ===================================================

  const [modalType, setModalType] =
    useState(null);


  // ===================================================
  // SELECTED PURCHASE ORDER
  // ===================================================

  const [selectedPO, setSelectedPO] =
    useState(null);


  // ===================================================
  // SELECTED SUPPLIER
  // ===================================================

  const [selectedSupplier, setSelectedSupplier] =
    useState(null);


  // ===================================================
  // PURCHASE ORDER FORM
  // ===================================================
  // IMPORTANT:
  // The old form only had supplier + value.
  //
  // Laravel requires:
  // supplier_id
  // fuel_id
  // quantity
  // unit_price
  // order_date
  //
  // total_amount is calculated by Laravel.
  // ===================================================

  const [poForm, setPoForm] = useState({
    supplier_id: "",
    fuel_id: "",
    quantity: "",
    unit_price: "",
    order_date: new Date()
      .toISOString()
      .split("T")[0],
    delivery_date: "",
    received_date: "",
    status: "pending",
    notes: "",
  });


  // ===================================================
  // PURCHASE ORDER FORM ERROR
  // ===================================================

  const [poFormError, setPoFormError] =
    useState("");


  // ===================================================
  // DELIVERY FORM
  // ===================================================

  const [deliveryForm, setDeliveryForm] =
    useState({
      po: "",
      supplier: "",
      fuel: "Diesel",
      volOrd: "",
      volRcv: "",
    });


  // ===================================================
  // SUPPLIER FORM
  // ===================================================

  const emptySupplierForm = {
    supplier_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    tax_id: "",
    payment_terms: "",
    is_active: true,
  };

  const [supplierForm, setSupplierForm] =
    useState(emptySupplierForm);


  // ===================================================
  // SUPPLIER SUBMIT STATE
  // ===================================================

  const [savingSupplier, setSavingSupplier] =
    useState(false);


  // ===================================================
  // SUPPLIER DELETE STATE
  // ===================================================

  const [deletingSupplierId, setDeletingSupplierId] =
    useState(null);


  // ===================================================
  // SUPPLIER FORM VALIDATION ERROR
  // ===================================================

  const [supplierFormError, setSupplierFormError] =
    useState("");


  // ===================================================
  // LOAD SUPPLIERS
  // ===================================================

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      setSupplierError("");

      const data = await getSuppliers();

      setSuppliers(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load suppliers:",
        error
      );

      setSupplierError(
        error.response?.data?.message ||
          "Failed to load suppliers."
      );

    } finally {
      setLoadingSuppliers(false);
    }
  };


  // ===================================================
  // LOAD PURCHASE ORDERS
  // ===================================================
  // GET /api/purchase-orders
  // Requires Sanctum authentication.
  // ===================================================

  const loadPurchaseOrders = async () => {

    try {

      setLoadingPurchaseOrders(true);
      setPurchaseOrderError("");

      const data =
        await getPurchaseOrders();

      setPurchaseOrders(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load purchase orders:",
        error
      );

      setPurchaseOrderError(
        error.response?.data?.message ||
          "Failed to load purchase orders."
      );

    } finally {

      setLoadingPurchaseOrders(false);

    }
  };


  // ===================================================
  // LOAD FUEL TYPES
  // ===================================================
  // GET /api/fuel-types
  // Used by Purchase Order form.
  // ===================================================

  const loadFuelTypes = async () => {

    try {

      setLoadingFuelTypes(true);
      setFuelTypeError("");

      const response =
        await api.get("/fuel-types");

      setFuelTypes(
        Array.isArray(response.data)
          ? response.data
          : []
      );

    } catch (error) {

      console.error(
        "Failed to load fuel types:",
        error
      );

      setFuelTypeError(
        error.response?.data?.message ||
          "Failed to load fuel types."
      );

    } finally {

      setLoadingFuelTypes(false);

    }
  };


  // ===================================================
  // LOAD DATA WHEN PAGE OPENS
  // ===================================================

  useEffect(() => {

    loadSuppliers();
    loadPurchaseOrders();
    loadFuelTypes();

  }, []);


  // ===================================================
  // FILTER SUPPLIERS
  // ===================================================

  const filteredSuppliers = useMemo(() => {

    return suppliers.filter((supplier) => {

      const searchText =
        supplierSearch
          .toLowerCase()
          .trim();

      const matchesSearch =
        !searchText ||
        supplier.supplier_name
          ?.toLowerCase()
          .includes(searchText) ||
        supplier.contact_person
          ?.toLowerCase()
          .includes(searchText) ||
        supplier.phone
          ?.toLowerCase()
          .includes(searchText) ||
        supplier.email
          ?.toLowerCase()
          .includes(searchText);

      const activeValue =
        Boolean(
          supplier.is_active
        );

      const matchesStatus =
        supplierStatus === "All" ||
        (
          supplierStatus === "Active" &&
          activeValue
        ) ||
        (
          supplierStatus === "Inactive" &&
          !activeValue
        );

      return (
        matchesSearch &&
        matchesStatus
      );

    });

  }, [
    suppliers,
    supplierSearch,
    supplierStatus,
  ]);


  // ===================================================
  // RESET PURCHASE ORDER FORM
  // ===================================================

  const resetPOForm = () => {

    setPoForm({
      supplier_id: "",
      fuel_id: "",
      quantity: "",
      unit_price: "",
      order_date: new Date()
        .toISOString()
        .split("T")[0],
      delivery_date: "",
      received_date: "",
      status: "pending",
      notes: "",
    });

    setPoFormError("");

  };


  // ===================================================
  // RESET SUPPLIER FORM
  // ===================================================

  const resetSupplierForm = () => {

    setSupplierForm(
      emptySupplierForm
    );

    setSupplierFormError("");
    setSelectedSupplier(null);

  };


  // ===================================================
  // OPEN CREATE PURCHASE ORDER
  // ===================================================

  const openCreatePO = () => {

    resetPOForm();

    setSelectedPO(null);

    setModalType("createPO");

  };


  // ===================================================
  // OPEN EDIT PURCHASE ORDER
  // ===================================================

  const openEditPO = (purchaseOrder) => {

    setSelectedPO(
      purchaseOrder
    );

    setPoForm({
      supplier_id:
        purchaseOrder.supplier_id ||
        "",

      fuel_id:
        purchaseOrder.fuel_id ||
        "",

      quantity:
        purchaseOrder.quantity ||
        "",

      unit_price:
        purchaseOrder.unit_price ||
        "",

      order_date:
        formatDateForInput(
          purchaseOrder.order_date
        ),

      delivery_date:
        formatDateForInput(
          purchaseOrder.delivery_date
        ),

      received_date:
        formatDateForInput(
          purchaseOrder.received_date
        ),

      status:
        purchaseOrder.status ||
        "pending",

      notes:
        purchaseOrder.notes ||
        "",
    });

    setPoFormError("");

    setModalType("editPO");

  };


  // ===================================================
  // OPEN CREATE SUPPLIER
  // ===================================================

  const openCreateSupplier = () => {

    resetSupplierForm();

    setModalType(
      "createSupplier"
    );

  };


  // ===================================================
  // OPEN VIEW SUPPLIER
  // ===================================================

  const openViewSupplier = (
    supplier
  ) => {

    setSelectedSupplier(
      supplier
    );

    setModalType(
      "viewSupplier"
    );

  };


  // ===================================================
  // OPEN EDIT SUPPLIER
  // ===================================================

  const openEditSupplier = (
    supplier
  ) => {

    setSelectedSupplier(
      supplier
    );

    setSupplierForm({

      supplier_name:
        supplier.supplier_name ||
        "",

      contact_person:
        supplier.contact_person ||
        "",

      phone:
        supplier.phone ||
        "",

      email:
        supplier.email ||
        "",

      address:
        supplier.address ||
        "",

      tax_id:
        supplier.tax_id ||
        "",

      payment_terms:
        supplier.payment_terms ||
        "",

      is_active:
        Boolean(
          supplier.is_active
        ),

    });

    setSupplierFormError("");

    setModalType(
      "editSupplier"
    );

  };


  // ===================================================
  // HANDLE PURCHASE ORDER INPUT
  // ===================================================

  const handlePOInput = (e) => {

    const {
      name,
      value,
    } = e.target;

    setPoForm((prev) => ({
      ...prev,
      [name]: value,
    }));

  };


  // ===================================================
  // CREATE / UPDATE PURCHASE ORDER
  // ===================================================
  // This replaces the old local-only handleCreatePO().
  //
  // CREATE:
  // POST /api/purchase-orders
  //
  // UPDATE:
  // PUT /api/purchase-orders/{id}
  //
  // Laravel calculates:
  // total_amount = quantity × unit_price
  //
  // Laravel also sets:
  // created_by = logged-in user's user_id
  // ===================================================

  const handlePurchaseOrderSubmit =
    async (e) => {

      e.preventDefault();

      setPoFormError("");

      if (!poForm.supplier_id) {

        setPoFormError(
          "Please select a supplier."
        );

        return;

      }

      if (!poForm.fuel_id) {

        setPoFormError(
          "Please select a fuel type."
        );

        return;

      }

      if (
        !poForm.quantity ||
        Number(
          poForm.quantity
        ) <= 0
      ) {

        setPoFormError(
          "Quantity must be greater than 0."
        );

        return;

      }

      if (
        poForm.unit_price === "" ||
        Number(
          poForm.unit_price
        ) < 0
      ) {

        setPoFormError(
          "Unit price is required."
        );

        return;

      }

      try {

        setSavingPO(true);

        // Generate PO number only when creating.
        const poNumber =
          selectedPO?.po_number ||
          generatePONumber();

        const payload = {

          po_number:
            poNumber,

          supplier_id:
            Number(
              poForm.supplier_id
            ),

          fuel_id:
            Number(
              poForm.fuel_id
            ),

          quantity:
            Number(
              poForm.quantity
            ),

          unit_price:
            Number(
              poForm.unit_price
            ),

          order_date:
            poForm.order_date,

          delivery_date:
            poForm.delivery_date ||
            null,

          received_date:
            poForm.received_date ||
            null,

          status:
            poForm.status ||
            "pending",

          notes:
            poForm.notes.trim() ||
            null,
        };


        // =================================================
        // CREATE PURCHASE ORDER
        // =================================================

        if (
          modalType ===
          "createPO"
        ) {

          await createPurchaseOrder(
            payload
          );

          alert(
            "Purchase Order created successfully."
          );

        }


        // =================================================
        // UPDATE PURCHASE ORDER
        // =================================================

        else if (
          modalType ===
            "editPO" &&
          selectedPO
        ) {

          await updatePurchaseOrder(
            selectedPO.purchase_order_id,
            payload
          );

          alert(
            "Purchase Order updated successfully."
          );

        }


        // Reload data from MySQL.
        await loadPurchaseOrders();

        resetPOForm();

        setSelectedPO(null);

        setModalType(null);

      } catch (error) {

        console.error(
          "Purchase Order save failed:",
          error
        );

        if (
          error.response?.status ===
          422
        ) {

          const errors =
            error.response
              ?.data
              ?.errors;

          if (errors) {

            const firstError =
              Object.values(
                errors
              )
                .flat()
                .find(Boolean);

            setPoFormError(
              firstError ||
                "Please check the Purchase Order information."
            );

          } else {

            setPoFormError(
              error.response
                ?.data
                ?.message ||
                "Validation failed."
            );

          }

        } else {

          setPoFormError(
            error.response
              ?.data
              ?.message ||
              "Failed to save Purchase Order."
          );

        }

      } finally {

        setSavingPO(false);

      }

    };


  // ===================================================
  // DELETE PURCHASE ORDER
  // ===================================================

  const handleDeletePO = async (
    purchaseOrder
  ) => {

    const confirmed =
      window.confirm(
        `Are you sure you want to delete Purchase Order "${purchaseOrder.po_number}"?`
      );

    if (!confirmed) return;

    try {

      setDeletingPOId(
        purchaseOrder.purchase_order_id
      );

      await deletePurchaseOrder(
        purchaseOrder.purchase_order_id
      );

      alert(
        "Purchase Order deleted successfully."
      );

      await loadPurchaseOrders();

    } catch (error) {

      console.error(
        "Delete Purchase Order failed:",
        error
      );

      if (
        error.response?.status ===
        409
      ) {

        alert(
          error.response.data
            ?.message ||
            "This Purchase Order cannot be deleted because it has purchase history."
        );

      } else {

        alert(
          error.response?.data
            ?.message ||
            "Failed to delete Purchase Order."
        );

      }

    } finally {

      setDeletingPOId(null);

    }

  };


  // ===================================================
  // HANDLE SUPPLIER FORM INPUT
  // ===================================================

  const handleSupplierInput = (
    e
  ) => {

    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setSupplierForm(
      (prev) => ({
        ...prev,

        [name]:
          type ===
          "checkbox"
            ? checked
            : value,
      })
    );

  };


  // ===================================================
  // CREATE / UPDATE SUPPLIER
  // ===================================================

  const handleSupplierSubmit =
    async (e) => {

      e.preventDefault();

      setSupplierFormError("");

      if (
        !supplierForm
          .supplier_name
          .trim()
      ) {

        setSupplierFormError(
          "Supplier name is required."
        );

        return;

      }

      if (
        !supplierForm.phone.trim()
      ) {

        setSupplierFormError(
          "Phone number is required."
        );

        return;

      }

      try {

        setSavingSupplier(
          true
        );

        const payload = {

          ...supplierForm,

          supplier_name:
            supplierForm
              .supplier_name
              .trim(),

          contact_person:
            supplierForm
              .contact_person
              .trim() ||
            null,

          phone:
            supplierForm.phone.trim(),

          email:
            supplierForm.email
              .trim() ||
            null,

          address:
            supplierForm.address
              .trim() ||
            null,

          tax_id:
            supplierForm.tax_id
              .trim() ||
            null,

          payment_terms:
            supplierForm
              .payment_terms
              .trim() ||
            null,

          is_active:
            supplierForm
              .is_active,
        };


        // =================================================
        // CREATE
        // =================================================

        if (
          modalType ===
          "createSupplier"
        ) {

          await createSupplier(
            payload
          );

          alert(
            "Supplier created successfully."
          );

        }


        // =================================================
        // UPDATE
        // =================================================

        else if (
          modalType ===
            "editSupplier" &&
          selectedSupplier
        ) {

          await updateSupplier(
            selectedSupplier
              .supplier_id,
            payload
          );

          alert(
            "Supplier updated successfully."
          );

        }


        await loadSuppliers();

        resetSupplierForm();

        setModalType(null);

      } catch (error) {

        console.error(
          "Supplier save failed:",
          error
        );

        if (
          error.response?.status ===
          422
        ) {

          const errors =
            error.response.data
              ?.errors;

          if (errors) {

            const firstError =
              Object.values(
                errors
              )
                .flat()
                .find(Boolean);

            setSupplierFormError(
              firstError ||
                "Please check the supplier information."
            );

          } else {

            setSupplierFormError(
              "Validation failed."
            );

          }

        } else {

          setSupplierFormError(
            error.response?.data
              ?.message ||
              "Failed to save supplier."
          );

        }

      } finally {

        setSavingSupplier(
          false
        );

      }

    };


  // ===================================================
  // DELETE SUPPLIER
  // ===================================================

  const handleDeleteSupplier =
    async (supplier) => {

      const confirmed =
        window.confirm(
          `Are you sure you want to delete "${supplier.supplier_name}"?`
        );

      if (!confirmed) return;

      try {

        setDeletingSupplierId(
          supplier.supplier_id
        );

        await deleteSupplier(
          supplier.supplier_id
        );

        alert(
          "Supplier deleted successfully."
        );

        await loadSuppliers();

      } catch (error) {

        console.error(
          "Delete supplier failed:",
          error
        );

        if (
          error.response?.status ===
          409
        ) {

          alert(
            error.response.data
              ?.message ||
              "This supplier cannot be deleted because it has purchase orders."
          );

        } else {

          alert(
            error.response?.data
              ?.message ||
              "Failed to delete supplier."
          );

        }

      } finally {

        setDeletingSupplierId(
          null
        );

      }

    };


  // ===================================================
  // RECEIVE TANKER DELIVERY
  // ===================================================
  // Still local because Delivery Log API has not been
  // implemented yet.
  // ===================================================

  const handleReceiveDelivery = (
    e
  ) => {

    e.preventDefault();

    const ord =
      parseFloat(
        deliveryForm.volOrd
      );

    const rcv =
      parseFloat(
        deliveryForm.volRcv
      );

    if (
      !ord ||
      ord <= 0 ||
      isNaN(rcv) ||
      rcv < 0
    ) {

      return;

    }

    const diff =
      (
        ((rcv - ord) / ord) *
        100
      ).toFixed(1);

    const numericDiff =
      Number(diff);

    const varText = `${
      numericDiff > 0
        ? "+"
        : ""
    }${diff}%`;

    const newDelivery = {

      po:
        deliveryForm.po ||
        generatePONumber(),

      date:
        new Date()
          .toISOString()
          .split("T")[0],

      supplier:
        deliveryForm.supplier ||
        "PTT Cambodia Co.",

      fuel:
        deliveryForm.fuel,

      volOrd:
        Number(
          deliveryForm.volOrd
        ).toLocaleString(),

      volRcv:
        Number(
          deliveryForm.volRcv
        ).toLocaleString(),

      variance:
        varText,

      status:
        Math.abs(
          numericDiff
        ) > 1.5
          ? "Flag"
          : "OK",
    };

    setDeliveryLog([
      newDelivery,
      ...deliveryLog,
    ]);

    setDeliveryForm({
      po: "",
      supplier: "",
      fuel: "Diesel",
      volOrd: "",
      volRcv: "",
    });

    setModalType(null);

  };


  // ===================================================
  // CLOSE MODAL
  // ===================================================

  const closeModal = () => {

    setModalType(null);

    setSelectedPO(null);

    setSelectedSupplier(
      null
    );

    setSupplierFormError("");

    setPoFormError("");

  };


  // ===================================================
  // RENDER
  // ===================================================

  return (

    <div className="p-6 space-y-6 bg-gray-300 min-h-screen">

      {/* =================================================
          TOP HEADER
      ================================================= */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <h1 className="text-xl font-bold text-slate-800">
            Suppliers &amp; Purchases Hub
          </h1>

          <p className="text-sm text-gray-800">
            Manage supplier operations, credit, and order history
          </p>

        </div>


        <div className="flex flex-wrap gap-2">

          {/* Create Purchase Order */}

          <button
            onClick={
              openCreatePO
            }
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-600 transition"
          >

            <FilePlus size={14} />

            Create Purchase Order

          </button>


          {/* Receive Delivery */}

          <button
            onClick={() =>
              setModalType(
                "receiveDelivery"
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >

            <Truck size={14} />

            Receive Tanker Delivery

          </button>


          {/* Credit Management */}

          <button
            onClick={() =>
              setModalType(
                "credit"
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >

            <ShieldCheck size={14} />

            Credit Management

          </button>


          {/* Purchase Reports */}

          <button
            onClick={() =>
              setModalType(
                "reports"
              )
            }
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >

            <FileBarChart size={14} />

            Purchase Reports

          </button>

        </div>

      </div>


      {/* =================================================
          TOP 3 ANALYTICAL CARDS
      ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">


        {/* Supplier Compliance */}

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">

            <span className="text-lg font-bold text-slate-700">
              Supplier Compliance Scorecard
            </span>

            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              90% Compliant
            </span>

          </div>


          <div className="grid grid-cols-3 gap-2 my-3">

            {scorecard.map(
              (s) => (

                <div
                  key={
                    s.grade
                  }
                  className="text-center p-2 rounded-xl bg-slate-300 border border-slate-300"
                >

                  <span
                    className="inline-block text-[10px] font-black px-2 py-0.5 rounded text-white mb-1"
                    style={{
                      background:
                        s.color,
                    }}
                  >
                    Grade {s.grade}
                  </span>

                  <div className="text-base font-bold text-black">
                    {s.pct}%
                  </div>

                  <div className="text-[10px] text-black">
                    Suppliers
                  </div>

                </div>

              )
            )}

          </div>


          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">

            {scorecard.map(
              (s) => (

                <div
                  key={
                    s.grade
                  }
                  style={{
                    width: `${s.pct}%`,
                    background:
                      s.color,
                  }}
                  className="h-full"
                />

              )
            )}

          </div>

        </div>


        {/* Accounts Payable */}

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">

          <div className="flex items-center justify-between pb-2 border-b border-gray-300">

            <span className="text-lg font-bold text-slate-700">
              Accounts Payable Ageing
            </span>

            <span className="text-xs font-extrabold text-slate-800">
              $9,700 Total
            </span>

          </div>


          <div className="w-full h-28 mt-2">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart
                data={ageing}
                margin={{
                  top: 10,
                  right: 0,
                  left: -25,
                  bottom: 0,
                }}
              >

                <XAxis
                  dataKey="bucket"
                  tick={{
                    fontSize: 10,
                    fill: "#94a3b8",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fontSize: 10,
                    fill: "#94a3b8",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(
                    value
                  ) => [
                    `$${value}`,
                    "Amount",
                  ]}
                  contentStyle={{
                    fontSize: "11px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid #e2e8f0",
                  }}
                />

                <Bar
                  dataKey="value"
                  radius={[
                    4,
                    4,
                    0,
                    0,
                  ]}
                  fill="#f59e0b"
                  barSize={28}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>


        {/* Upcoming Due Payments */}

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-3">

          <div className="flex items-center justify-between pb-2 border-b border-slate-100">

            <span className="text-lg font-bold text-slate-700">
              Upcoming Due Payments
            </span>

            <span className="text-base text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              Due Soon
            </span>

          </div>


          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex items-center justify-between">

            <div>

              <div className="text-sm font-semibold text-amber-600 uppercase">
                Due in 3 Days
              </div>

              <div className="text-xl font-extrabold text-amber-700">
                $5,000
              </div>

            </div>

            <Clock className="w-6 h-6 text-amber-400 opacity-60" />

          </div>


          <div className="flex items-center justify-between px-1 text-xs">

            <div>

              <div className="text-xs text-black">
                Total Credit Utilized
              </div>

              <div className="font-bold text-slate-700">

                $25,000{" "}

                <span className="text-[10px] font-normal text-slate-400">
                  / $50,000
                </span>

              </div>

            </div>


            <div className="text-right">

              <span className="text-base font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                50% Available
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          FUEL TANKER DELIVERY LOG
      ================================================= */}

      <Panel>

        <span className="text-lg font-bold text-slate-700">
          Fuel Tanker Delivery Log
        </span>


        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs">

            <thead>

              <tr className="text-black border-b border-gray-300 text-base">

                <th className="pb-3 font-medium">
                  PO ID
                </th>

                <th className="pb-3 font-medium">
                  Date
                </th>

                <th className="pb-3 font-medium">
                  Supplier
                </th>

                <th className="pb-3 font-medium">
                  Fuel Type
                </th>

                <th className="pb-3 font-medium">
                  Vol. Ordered
                </th>

                <th className="pb-3 font-medium">
                  Vol. Received
                </th>

                <th className="pb-3 font-medium">
                  Variance
                </th>

                <th className="pb-3 font-medium">
                  Status
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-gray-300">

              {deliveryLog.map(
                (
                  d,
                  index
                ) => (

                  <tr
                    key={
                      index
                    }
                    className="hover:bg-slate-50/60 transition text-sm"
                  >

                    <td className="py-3 font-semibold text-slate-700">
                      #{d.po}
                    </td>

                    <td className="py-3 text-black">
                      {d.date}
                    </td>

                    <td className="py-3 font-medium text-slate-700">
                      {d.supplier}
                    </td>

                    <td className="py-3 text-black">
                      {d.fuel}
                    </td>

                    <td className="py-3 text-black">
                      {d.volOrd} L
                    </td>

                    <td className="py-3 text-slate-600">
                      {d.volRcv} L
                    </td>

                    <td
                      className={`py-3 font-medium ${
                        d.variance.startsWith(
                          "-"
                        )
                          ? "text-rose-500"
                          : "text-slate-500"
                      }`}
                    >
                      {d.variance}
                    </td>

                    <td className="py-3">

                      <StatusBadge
                        status={
                          d.status ===
                          "OK"
                            ? "Active"
                            : "Critical Low"
                        }
                      />

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </Panel>


      {/* =================================================
          TWO GRID TABLES
      ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">


        {/* =================================================
            ACTIVE PURCHASE ORDERS
        ================================================= */}

        <Panel title="">

          <div className="flex items-center justify-between mb-3">

            <span className="text-lg font-bold text-slate-700">
              Active Purchase Orders (POs)
            </span>

            {!loadingPurchaseOrders &&
              purchaseOrders.length >
                0 && (
                <span className="text-xs text-slate-500">
                  {purchaseOrders.length} PO(s)
                </span>
              )}

          </div>


          {purchaseOrderError && (

            <div className="mb-3 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">

              <div className="text-xs text-rose-600 mb-1">
                {purchaseOrderError}
              </div>

              <button
                onClick={
                  loadPurchaseOrders
                }
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
              >
                Try Again
              </button>

            </div>

          )}


          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs">

              <thead>

                <tr className="text-black border-b border-gray-300 text-base">

                  <th className="pb-3 font-medium">
                    PO ID
                  </th>

                  <th className="pb-3 font-medium">
                    Date
                  </th>

                  <th className="pb-3 font-medium">
                    Supplier
                  </th>

                  <th className="pb-3 font-medium">
                    Value
                  </th>

                  <th className="pb-3 font-medium">
                    Status
                  </th>

                  <th className="pb-3 font-medium">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-gray-300">


                {/* Loading */}

                {loadingPurchaseOrders && (

                  <tr>

                    <td
                      colSpan="6"
                      className="py-8 text-center text-slate-500"
                    >

                      <div className="flex items-center justify-center gap-2">

                        <Loader2
                          size={16}
                          className="animate-spin"
                        />

                        Loading Purchase Orders...

                      </div>

                    </td>

                  </tr>

                )}


                {/* Empty */}

                {!loadingPurchaseOrders &&
                  !purchaseOrderError &&
                  purchaseOrders.length ===
                    0 && (

                    <tr>

                      <td
                        colSpan="6"
                        className="py-8 text-center text-slate-400"
                      >
                        No Purchase Orders found.
                      </td>

                    </tr>

                  )}


                {/* Purchase Order Rows */}

                {!loadingPurchaseOrders &&
                  purchaseOrders.map(
                    (p) => (

                      <tr
                        key={
                          p.purchase_order_id
                        }
                        className="hover:bg-slate-50/60 transition"
                      >

                        <td className="py-3 font-semibold text-slate-700">
                          #
                          {
                            p.po_number
                          }
                        </td>


                        <td className="py-3 text-slate-500">
                          {formatDisplayDate(
                            p.order_date
                          )}
                        </td>


                        <td className="py-3 font-medium text-slate-700">
                          {
                            p.supplier
                              ?.supplier_name ||
                              "-"
                          }
                        </td>


                        <td className="py-3 font-bold text-slate-800">

                          $
                          {formatMoney(
                            p.total_amount
                          )}

                        </td>


                        <td className="py-3">

                          <StatusBadge
                            status={getPOStatusBadge(
                              p.status
                            )}
                          />

                        </td>


                        <td className="py-3">

                          <div className="flex items-center gap-2">

                            {/* View */}

                            <button
                              onClick={() => {

                                setSelectedPO(
                                  p
                                );

                                setModalType(
                                  "viewPO"
                                );

                              }}
                              title="View Purchase Order"
                              className="text-cyan-600 hover:text-cyan-700"
                            >

                              <Eye
                                size={15}
                              />

                            </button>


                            {/* Edit */}

                            <button
                              onClick={() =>
                                openEditPO(
                                  p
                                )
                              }
                              title="Edit Purchase Order"
                              className="text-slate-500 hover:text-amber-600"
                            >

                              <Pencil
                                size={15}
                              />

                            </button>


                            {/* Delete */}

                            <button
                              onClick={() =>
                                handleDeletePO(
                                  p
                                )
                              }
                              disabled={
                                deletingPOId ===
                                p.purchase_order_id
                              }
                              title="Delete Purchase Order"
                              className="text-slate-500 hover:text-rose-600 disabled:opacity-50"
                            >

                              {deletingPOId ===
                              p.purchase_order_id ? (

                                <Loader2
                                  size={15}
                                  className="animate-spin"
                                />

                              ) : (

                                <Trash2
                                  size={15}
                                />

                              )}

                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )}

              </tbody>

            </table>

          </div>

        </Panel>


        {/* =================================================
            SUPPLIER DIRECTORY
        ================================================= */}

        <Panel title="">

          <div className="flex flex-col gap-3">


            <div className="flex items-center justify-between gap-2">

              <span className="text-lg font-bold text-slate-700">
                Supplier Directory
              </span>


              <button
                onClick={
                  openCreateSupplier
                }
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-600 transition"
              >

                <Plus
                  size={14}
                />

                Add Supplier

              </button>

            </div>


            {/* Search */}

            <div className="flex flex-col sm:flex-row gap-2">

              <div className="relative flex-1">

                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    supplierSearch
                  }
                  onChange={(e) =>
                    setSupplierSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search supplier..."
                  className="w-full border border-slate-200 rounded-lg py-2 pl-8 pr-3 text-xs bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                />

              </div>


              <select
                value={
                  supplierStatus
                }
                onChange={(e) =>
                  setSupplierStatus(
                    e.target.value
                  )
                }
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
              >

                <option value="All">
                  All
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>

              </select>

            </div>

          </div>


          {/* Supplier Table */}

          <div className="overflow-x-auto mt-3">

            <table className="w-full text-left text-xs">

              <thead>

                <tr className="text-black border-b border-gray-300 text-base">

                  <th className="pb-3 font-medium">
                    Supplier
                  </th>

                  <th className="pb-3 font-medium">
                    Contact
                  </th>

                  <th className="pb-3 font-medium">
                    Phone
                  </th>

                  <th className="pb-3 font-medium">
                    Terms
                  </th>

                  <th className="pb-3 font-medium">
                    Status
                  </th>

                  <th className="pb-3 font-medium">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-gray-300">


                {loadingSuppliers && (

                  <tr>

                    <td
                      colSpan="6"
                      className="py-8 text-center text-slate-500"
                    >

                      <div className="flex items-center justify-center gap-2">

                        <Loader2
                          size={16}
                          className="animate-spin"
                        />

                        Loading suppliers...

                      </div>

                    </td>

                  </tr>

                )}


                {!loadingSuppliers &&
                  supplierError && (

                    <tr>

                      <td
                        colSpan="6"
                        className="py-8 text-center"
                      >

                        <div className="text-rose-500 text-xs mb-2">
                          {
                            supplierError
                          }
                        </div>

                        <button
                          onClick={
                            loadSuppliers
                          }
                          className="text-cyan-600 font-semibold hover:text-cyan-700"
                        >
                          Try Again
                        </button>

                      </td>

                    </tr>

                  )}


                {!loadingSuppliers &&
                  !supplierError &&
                  filteredSuppliers.length ===
                    0 && (

                    <tr>

                      <td
                        colSpan="6"
                        className="py-8 text-center text-slate-400"
                      >
                        No suppliers found.
                      </td>

                    </tr>

                  )}


                {!loadingSuppliers &&
                  !supplierError &&
                  filteredSuppliers.map(
                    (
                      supplier
                    ) => (

                      <tr
                        key={
                          supplier.supplier_id
                        }
                        className="hover:bg-slate-50/60 transition"
                      >

                        <td className="py-3 font-semibold text-slate-800">
                          {
                            supplier.supplier_name
                          }
                        </td>

                        <td className="py-3 text-slate-500">
                          {
                            supplier.contact_person ||
                              "-"
                          }
                        </td>

                        <td className="py-3 text-slate-500">
                          {
                            supplier.phone
                          }
                        </td>

                        <td className="py-3 text-slate-500">
                          {
                            supplier.payment_terms ||
                              "-"
                          }
                        </td>

                        <td className="py-3">

                          <StatusBadge
                            status={
                              Boolean(
                                supplier.is_active
                              )
                                ? "Active"
                                : "Check Status"
                            }
                          />

                        </td>

                        <td className="py-3">

                          <div className="flex items-center gap-2">

                            <button
                              onClick={() =>
                                openViewSupplier(
                                  supplier
                                )
                              }
                              title="View Supplier"
                              className="text-slate-500 hover:text-cyan-600"
                            >

                              <Eye
                                size={15}
                              />

                            </button>


                            <button
                              onClick={() =>
                                openEditSupplier(
                                  supplier
                                )
                              }
                              title="Edit Supplier"
                              className="text-slate-500 hover:text-amber-600"
                            >

                              <Pencil
                                size={15}
                              />

                            </button>


                            <button
                              onClick={() =>
                                handleDeleteSupplier(
                                  supplier
                                )
                              }
                              disabled={
                                deletingSupplierId ===
                                supplier.supplier_id
                              }
                              title="Delete Supplier"
                              className="text-slate-500 hover:text-rose-600 disabled:opacity-50"
                            >

                              {deletingSupplierId ===
                              supplier.supplier_id ? (

                                <Loader2
                                  size={15}
                                  className="animate-spin"
                                />

                              ) : (

                                <Trash2
                                  size={15}
                                />

                              )}

                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )}

              </tbody>

            </table>

          </div>

        </Panel>

      </div>


      {/* =================================================
          MODAL: CREATE / EDIT PURCHASE ORDER
      ================================================= */}

      {(modalType ===
        "createPO" ||
        modalType ===
          "editPO") && (

        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">


            <div className="flex justify-between items-center border-b pb-3">

              <h3 className="font-bold text-slate-800 text-sm">

                {modalType ===
                "createPO"
                  ? "Create New Purchase Order"
                  : "Edit Purchase Order"}

              </h3>


              <button
                onClick={
                  closeModal
                }
                className="text-slate-400 hover:text-slate-600"
              >

                <X
                  size={18}
                />

              </button>

            </div>


            {/* Error */}

            {poFormError && (

              <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-600">
                {
                  poFormError
                }
              </div>

            )}


            <form
              onSubmit={
                handlePurchaseOrderSubmit
              }
              className="space-y-3 text-xs"
            >


              {/* Supplier */}

              <div>

                <label className="block text-slate-600 mb-1 font-medium">
                  Select Supplier *
                </label>

                <select
                  required
                  name="supplier_id"
                  value={
                    poForm.supplier_id
                  }
                  onChange={
                    handlePOInput
                  }
                  className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                >

                  <option value="">
                    -- Choose Supplier --
                  </option>

                  {suppliers
                    .filter(
                      (s) =>
                        Boolean(
                          s.is_active
                        )
                    )
                    .map(
                      (s) => (

                        <option
                          key={
                            s.supplier_id
                          }
                          value={
                            s.supplier_id
                          }
                        >
                          {
                            s.supplier_name
                          }
                        </option>

                      )
                    )}

                </select>

              </div>


              {/* Fuel Type */}

              <div>

                <label className="block text-slate-600 mb-1 font-medium">
                  Fuel Type *
                </label>

                <select
                  required
                  name="fuel_id"
                  value={
                    poForm.fuel_id
                  }
                  onChange={
                    handlePOInput
                  }
                  disabled={
                    loadingFuelTypes
                  }
                  className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500 disabled:opacity-60"
                >

                  <option value="">

                    {loadingFuelTypes
                      ? "Loading fuel types..."
                      : "-- Choose Fuel Type --"}

                  </option>

                  {fuelTypes.map(
                    (fuel) => (

                      <option
                        key={
                          fuel.fuel_id
                        }
                        value={
                          fuel.fuel_id
                        }
                      >

                        {
                          fuel.fuel_name ||
                          fuel.name ||
                          fuel.fuel_type ||
                          `Fuel #${fuel.fuel_id}`
                        }

                      </option>

                    )
                  )}

                </select>

                {fuelTypeError && (

                  <div className="mt-1 text-[11px] text-rose-500">
                    {
                      fuelTypeError
                    }
                  </div>

                )}

              </div>


              {/* Quantity + Unit Price */}

              <div className="grid grid-cols-2 gap-2">


                <div>

                  <label className="block text-slate-600 mb-1 font-medium">
                    Quantity (L) *
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    required
                    min="0.001"
                    step="0.001"
                    value={
                      poForm.quantity
                    }
                    onChange={
                      handlePOInput
                    }
                    placeholder="e.g. 12000"
                    className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                  />

                </div>


                <div>

                  <label className="block text-slate-600 mb-1 font-medium">
                    Unit Price ($) *
                  </label>

                  <input
                    type="number"
                    name="unit_price"
                    required
                    min="0"
                    step="0.01"
                    value={
                      poForm.unit_price
                    }
                    onChange={
                      handlePOInput
                    }
                    placeholder="e.g. 1.30"
                    className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                  />

                </div>

              </div>


              {/* Calculated Total */}

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">

                <div className="flex justify-between items-center">

                  <span className="text-slate-500">
                    Estimated Total
                  </span>

                  <span className="font-bold text-slate-800">

                    $
                    {formatMoney(
                      Number(
                        poForm.quantity ||
                          0
                      ) *
                        Number(
                          poForm.unit_price ||
                            0
                        )
                    )}

                  </span>

                </div>

                <div className="mt-1 text-[10px] text-slate-400">
                  Final total is calculated by Laravel.
                </div>

              </div>


              {/* Order Date */}

              <div>

                <label className="block text-slate-600 mb-1 font-medium">
                  Order Date *
                </label>

                <input
                  type="date"
                  name="order_date"
                  required
                  value={
                    poForm.order_date
                  }
                  onChange={
                    handlePOInput
                  }
                  className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                />

              </div>


              {/* Delivery Date */}

              <div>

                <label className="block text-slate-600 mb-1 font-medium">
                  Expected Delivery Date
                </label>

                <input
                  type="date"
                  name="delivery_date"
                  value={
                    poForm.delivery_date
                  }
                  onChange={
                    handlePOInput
                  }
                  className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                />

              </div>


              {/* Received Date */}

              <div>

                <label className="block text-slate-600 mb-1 font-medium">
                  Received Date
                </label>

                <input
                  type="date"
                  name="received_date"
                  value={
                    poForm.received_date
                  }
                  onChange={
                    handlePOInput
                  }
                  className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                />

              </div>


              {/* Status */}

              <div>

                <label className="block text-slate-600 mb-1 font-medium">
                  Status
                </label>

                <select
                  name="status"
                  value={
                    poForm.status
                  }
                  onChange={
                    handlePOInput
                  }
                  className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                >

                  <option value="pending">
                    Pending
                  </option>

                  <option value="ordered">
                    Ordered
                  </option>

                  <option value="delivered">
                    Delivered
                  </option>

                  <option value="received">
                    Received
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>

                </select>

              </div>


              {/* Notes */}

              <div>

                <label className="block text-slate-600 mb-1 font-medium">
                  Notes
                </label>

                <textarea
                  name="notes"
                  rows="3"
                  value={
                    poForm.notes
                  }
                  onChange={
                    handlePOInput
                  }
                  placeholder="Enter notes..."
                  className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500 resize-none"
                />

              </div>


              {/* Buttons */}

              <div className="flex justify-end gap-2 pt-2">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    savingPO
                  }
                  className="px-3 py-1.5 border rounded-lg text-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={
                    savingPO
                  }
                  className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 disabled:opacity-50 inline-flex items-center gap-1.5"
                >

                  {savingPO && (

                    <Loader2
                      size={14}
                      className="animate-spin"
                    />

                  )}

                  {savingPO
                    ? "Saving..."
                    : modalType ===
                        "createPO"
                      ? "Create PO"
                      : "Update PO"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =================================================
          MODAL: RECEIVE TANKER DELIVERY
      ================================================= */}

      {modalType ===
        "receiveDelivery" && (

        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4">

            <div className="flex justify-between items-center border-b pb-3">

              <h3 className="font-bold text-slate-800 text-sm">
                Receive Fuel Delivery
              </h3>

              <button
                onClick={
                  closeModal
                }
                className="text-slate-400 hover:text-slate-600"
              >

                <X size={18} />

              </button>

            </div>


            <form
              onSubmit={
                handleReceiveDelivery
              }
              className="space-y-3 text-xs"
            >

              <div>

                <label className="block text-slate-600 mb-1 font-medium">
                  Select Active PO ID
                </label>

                <select
                  required
                  value={
                    deliveryForm.po
                  }
                  onChange={(e) => {

                    const poObj =
                      purchaseOrders.find(
                        (p) =>
                          p.po_number ===
                          e.target.value
                      );

                    setDeliveryForm(
                      {
                        ...deliveryForm,

                        po:
                          e.target
                            .value,

                        supplier:
                          poObj
                            ?.supplier
                            ?.supplier_name ||
                          "",
                      }
                    );

                  }}
                  className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                >

                  <option value="">
                    -- Choose PO --
                  </option>

                  {purchaseOrders
                    .filter(
                      (p) =>
                        p.status !==
                          "cancelled" &&
                        p.status !==
                          "received"
                    )
                    .map(
                      (p) => (

                        <option
                          key={
                            p.purchase_order_id
                          }
                          value={
                            p.po_number
                          }
                        >

                          #
                          {
                            p.po_number
                          }{" "}
                          -{" "}
                          {
                            p.supplier
                              ?.supplier_name ||
                              "-"
                          }

                        </option>

                      )
                    )}

                </select>

              </div>


              <div className="grid grid-cols-2 gap-2">

                <div>

                  <label className="block text-slate-600 mb-1 font-medium">
                    Vol. Ordered (L)
                  </label>

                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="5000"
                    value={
                      deliveryForm.volOrd
                    }
                    onChange={(e) =>
                      setDeliveryForm(
                        {
                          ...deliveryForm,
                          volOrd:
                            e.target
                              .value,
                        }
                      )
                    }
                    className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                  />

                </div>


                <div>

                  <label className="block text-slate-600 mb-1 font-medium">
                    Vol. Received (L)
                  </label>

                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="4980"
                    value={
                      deliveryForm.volRcv
                    }
                    onChange={(e) =>
                      setDeliveryForm(
                        {
                          ...deliveryForm,
                          volRcv:
                            e.target
                              .value,
                        }
                      )
                    }
                    className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
                  />

                </div>

              </div>


              <div className="flex justify-end gap-2 pt-2">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  className="px-3 py-1.5 border rounded-lg text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600"
                >
                  Record Delivery
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =================================================
          MODAL: CREDIT MANAGEMENT
      ================================================= */}

      {modalType ===
        "credit" && (

        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">

            <div className="flex justify-between items-center border-b pb-3">

              <h3 className="font-bold text-slate-800 text-sm">
                Credit Management Summary
              </h3>

              <button
                onClick={
                  closeModal
                }
                className="text-slate-400 hover:text-slate-600"
              >

                <X size={18} />

              </button>

            </div>


            <div className="space-y-3 text-xs">

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">

                <div className="text-slate-400">
                  Total Credit Limit
                </div>

                <div className="text-lg font-bold text-slate-800">
                  $50,000.00
                </div>

              </div>


              <div className="p-3 bg-slate-50 rounded-xl space-y-1">

                <div className="text-slate-400">
                  Current Credit Used
                </div>

                <div className="text-lg font-bold text-amber-600">
                  $25,000.00
                </div>

              </div>


              <div className="p-3 bg-slate-50 rounded-xl space-y-1">

                <div className="text-slate-400">
                  Available Credit Margin
                </div>

                <div className="text-lg font-bold text-emerald-600">
                  $25,000.00
                </div>

              </div>

            </div>


            <button
              onClick={
                closeModal
              }
              className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Done
            </button>

          </div>

        </div>

      )}


      {/* =================================================
          MODAL: VIEW PO DETAILS
      ================================================= */}

      {modalType ===
        "viewPO" &&
        selectedPO && (

          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4">

              <div className="flex justify-between items-center border-b pb-3">

                <h3 className="font-bold text-slate-800 text-sm">
                  PO Details #
                  {
                    selectedPO.po_number
                  }
                </h3>

                <button
                  onClick={
                    closeModal
                  }
                  className="text-slate-400 hover:text-slate-600"
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              <div className="space-y-2.5 text-xs text-slate-600">

                <div className="flex justify-between gap-4">

                  <span>
                    PO Number:
                  </span>

                  <span className="font-semibold text-slate-800">
                    {
                      selectedPO.po_number
                    }
                  </span>

                </div>


                <div className="flex justify-between gap-4">

                  <span>
                    Date Created:
                  </span>

                  <span className="font-semibold text-slate-800">
                    {formatDisplayDate(
                      selectedPO.order_date
                    )}
                  </span>

                </div>


                <div className="flex justify-between gap-4">

                  <span>
                    Supplier Name:
                  </span>

                  <span className="font-semibold text-slate-800 text-right">
                    {
                      selectedPO
                        .supplier
                        ?.supplier_name ||
                      "-"
                    }
                  </span>

                </div>


                <div className="flex justify-between gap-4">

                  <span>
                    Fuel Type:
                  </span>

                  <span className="font-semibold text-slate-800 text-right">
                    {
                      getFuelTypeName(
                        selectedPO
                      )
                    }
                  </span>

                </div>


                <div className="flex justify-between gap-4">

                  <span>
                    Quantity:
                  </span>

                  <span className="font-semibold text-slate-800">
                    {
                      formatNumber(
                        selectedPO.quantity
                      )
                    }{" "}
                    L
                  </span>

                </div>


                <div className="flex justify-between gap-4">

                  <span>
                    Unit Price:
                  </span>

                  <span className="font-semibold text-slate-800">
                    $
                    {formatMoney(
                      selectedPO.unit_price
                    )}
                  </span>

                </div>


                <div className="flex justify-between gap-4">

                  <span>
                    Total Amount:
                  </span>

                  <span className="font-bold text-slate-800">
                    $
                    {formatMoney(
                      selectedPO.total_amount
                    )}
                  </span>

                </div>


                <div className="flex justify-between items-center gap-4">

                  <span>
                    Status:
                  </span>

                  <StatusBadge
                    status={getPOStatusBadge(
                      selectedPO.status
                    )}
                  />

                </div>


                <div className="flex justify-between gap-4">

                  <span>
                    Created By:
                  </span>

                  <span className="font-semibold text-slate-800">
                    {
                      selectedPO
                        .createdBy
                        ?.full_name ||
                      "-"
                    }
                  </span>

                </div>


                {selectedPO.approvedBy && (

                  <div className="flex justify-between gap-4">

                    <span>
                      Approved By:
                    </span>

                    <span className="font-semibold text-slate-800">
                      {
                        selectedPO
                          .approvedBy
                          ?.full_name ||
                        "-"
                      }
                    </span>

                  </div>

                )}


                <div className="flex justify-between gap-4">

                  <span>
                    Delivery Date:
                  </span>

                  <span className="font-semibold text-slate-800">
                    {
                      formatDisplayDate(
                        selectedPO.delivery_date
                      )
                    }
                  </span>

                </div>


                <div className="flex justify-between gap-4">

                  <span>
                    Received Date:
                  </span>

                  <span className="font-semibold text-slate-800">
                    {
                      formatDisplayDate(
                        selectedPO.received_date
                      )
                    }
                  </span>

                </div>


                {selectedPO.notes && (

                  <div className="border-t border-slate-100 pt-2">

                    <div className="text-slate-500 mb-1">
                      Notes
                    </div>

                    <div className="text-slate-800">
                      {
                        selectedPO.notes
                      }
                    </div>

                  </div>

                )}

              </div>


              <div className="flex gap-2">

                <button
                  onClick={() =>
                    openEditPO(
                      selectedPO
                    )
                  }
                  className="flex-1 py-2 bg-cyan-500 text-white rounded-xl text-xs font-semibold hover:bg-cyan-600"
                >
                  Edit PO
                </button>


                <button
                  onClick={
                    closeModal
                  }
                  className="flex-1 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}


      {/* =================================================
          MODAL: PURCHASE REPORTS
      ================================================= */}

      {modalType ===
        "reports" && (

        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 text-center space-y-3">

            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />

            <h3 className="font-bold text-slate-800 text-sm">
              Purchase Reports Generated
            </h3>

            <p className="text-xs text-slate-500">
              Your monthly supplier report
              and delivery metrics have
              been downloaded successfully.
            </p>

            <button
              onClick={
                closeModal
              }
              className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Done
            </button>

          </div>

        </div>

      )}


      {/* =================================================
          MODAL: CREATE SUPPLIER
      ================================================= */}

      {modalType ===
        "createSupplier" && (

        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center border-b pb-3">

              <h3 className="font-bold text-slate-800 text-sm">
                Add New Supplier
              </h3>

              <button
                onClick={
                  closeModal
                }
                className="text-slate-400 hover:text-slate-600"
              >

                <X size={18} />

              </button>

            </div>


            <SupplierForm
              form={
                supplierForm
              }
              onChange={
                handleSupplierInput
              }
              onSubmit={
                handleSupplierSubmit
              }
              onCancel={
                closeModal
              }
              saving={
                savingSupplier
              }
              error={
                supplierFormError
              }
              submitText="Create Supplier"
            />

          </div>

        </div>

      )}


      {/* =================================================
          MODAL: EDIT SUPPLIER
      ================================================= */}

      {modalType ===
        "editSupplier" &&
        selectedSupplier && (

          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

            <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">

              <div className="flex justify-between items-center border-b pb-3">

                <h3 className="font-bold text-slate-800 text-sm">
                  Edit Supplier
                </h3>

                <button
                  onClick={
                    closeModal
                  }
                  className="text-slate-400 hover:text-slate-600"
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              <SupplierForm
                form={
                  supplierForm
                }
                onChange={
                  handleSupplierInput
                }
                onSubmit={
                  handleSupplierSubmit
                }
                onCancel={
                  closeModal
                }
                saving={
                  savingSupplier
                }
                error={
                  supplierFormError
                }
                submitText="Update Supplier"
              />

            </div>

          </div>

        )}


      {/* =================================================
          MODAL: VIEW SUPPLIER
      ================================================= */}

      {modalType ===
        "viewSupplier" &&
        selectedSupplier && (

          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4">

              <div className="flex justify-between items-center border-b pb-3">

                <h3 className="font-bold text-slate-800 text-sm">
                  Supplier Details
                </h3>

                <button
                  onClick={
                    closeModal
                  }
                  className="text-slate-400 hover:text-slate-600"
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              <div className="space-y-3 text-xs">

                <SupplierDetail
                  label="Supplier Name"
                  value={
                    selectedSupplier
                      .supplier_name
                  }
                />

                <SupplierDetail
                  label="Contact Person"
                  value={
                    selectedSupplier
                      .contact_person ||
                    "-"
                  }
                />

                <SupplierDetail
                  label="Phone"
                  value={
                    selectedSupplier
                      .phone
                  }
                />

                <SupplierDetail
                  label="Email"
                  value={
                    selectedSupplier
                      .email ||
                    "-"
                  }
                />

                <SupplierDetail
                  label="Address"
                  value={
                    selectedSupplier
                      .address ||
                    "-"
                  }
                />

                <SupplierDetail
                  label="Tax ID"
                  value={
                    selectedSupplier
                      .tax_id ||
                    "-"
                  }
                />

                <SupplierDetail
                  label="Payment Terms"
                  value={
                    selectedSupplier
                      .payment_terms ||
                    "-"
                  }
                />


                <div className="flex justify-between items-center border-b border-slate-100 pb-2">

                  <span className="text-slate-500">
                    Status
                  </span>

                  <StatusBadge
                    status={
                      Boolean(
                        selectedSupplier
                          .is_active
                      )
                        ? "Active"
                        : "Check Status"
                    }
                  />

                </div>

              </div>


              <div className="flex gap-2">

                <button
                  onClick={() =>
                    openEditSupplier(
                      selectedSupplier
                    )
                  }
                  className="flex-1 py-2 bg-cyan-500 text-white rounded-xl text-xs font-semibold hover:bg-cyan-600"
                >
                  Edit Supplier
                </button>


                <button
                  onClick={
                    closeModal
                  }
                  className="flex-1 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

    </div>

  );
}


// =====================================================
// HELPER: GENERATE PURCHASE ORDER NUMBER
// =====================================================
// Laravel requires po_number to be unique.
// Example:
// PO-2026-100001
// =====================================================

function generatePONumber() {

  const year =
    new Date()
      .getFullYear();

  const random =
    Math.floor(
      100000 +
        Math.random() *
          900000
    );

  return `PO-${year}-${random}`;

}


// =====================================================
// HELPER: FORMAT DATE FOR INPUT
// =====================================================
// Converts Laravel date/datetime into:
// YYYY-MM-DD
// =====================================================

function formatDateForInput(
  value
) {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return String(value)
      .slice(0, 10);

  }

  return date
    .toISOString()
    .slice(0, 10);

}


// =====================================================
// HELPER: FORMAT DISPLAY DATE
// =====================================================

function formatDisplayDate(
  value
) {

  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return String(value)
      .slice(0, 10);

  }

  return date.toLocaleDateString(
    "en-US"
  );

}


// =====================================================
// HELPER: FORMAT MONEY
// =====================================================

function formatMoney(
  value
) {

  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {

    return "0.00";

  }

  return number.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

}


// =====================================================
// HELPER: FORMAT NUMBER
// =====================================================

function formatNumber(
  value
) {

  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {

    return "0";

  }

  return number.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 3,
    }
  );

}


// =====================================================
// HELPER: GET FUEL TYPE NAME
// =====================================================

function getFuelTypeName(
  purchaseOrder
) {

  if (
    purchaseOrder?.fuelType
  ) {

    return (
      purchaseOrder
        .fuelType
        .fuel_name ||
      purchaseOrder
        .fuelType
        .name ||
      purchaseOrder
        .fuelType
        .fuel_type ||
      `Fuel #${purchaseOrder.fuel_id}`
    );

  }

  return `Fuel #${purchaseOrder?.fuel_id || "-"}`;

}


// =====================================================
// HELPER: PURCHASE ORDER STATUS BADGE
// =====================================================

function getPOStatusBadge(
  status
) {

  switch (
    status
  ) {

    case "pending":
      return "Check Status";

    case "ordered":
      return "Active";

    case "delivered":
      return "Active";

    case "received":
      return "Active";

    case "cancelled":
      return "Critical Low";

    default:
      return "Check Status";

  }

}


// =====================================================
// SUPPLIER FORM COMPONENT
// =====================================================

function SupplierForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  saving,
  error,
  submitText,
}) {

  return (

    <form
      onSubmit={
        onSubmit
      }
      className="space-y-3 text-xs"
    >

      {error && (

        <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-rose-600">
          {error}
        </div>

      )}


      {/* Supplier Name */}

      <div>

        <label className="block text-slate-600 mb-1 font-medium">
          Supplier Name *
        </label>

        <input
          type="text"
          name="supplier_name"
          required
          maxLength={100}
          value={
            form.supplier_name
          }
          onChange={
            onChange
          }
          placeholder="Enter supplier name"
          className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
        />

      </div>


      {/* Contact Person */}

      <div>

        <label className="block text-slate-600 mb-1 font-medium">
          Contact Person
        </label>

        <input
          type="text"
          name="contact_person"
          maxLength={100}
          value={
            form.contact_person
          }
          onChange={
            onChange
          }
          placeholder="Enter contact person"
          className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
        />

      </div>


      {/* Phone */}

      <div>

        <label className="block text-slate-600 mb-1 font-medium">
          Phone *
        </label>

        <input
          type="text"
          name="phone"
          required
          maxLength={20}
          value={
            form.phone
          }
          onChange={
            onChange
          }
          placeholder="Enter phone number"
          className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
        />

      </div>


      {/* Email */}

      <div>

        <label className="block text-slate-600 mb-1 font-medium">
          Email
        </label>

        <input
          type="email"
          name="email"
          maxLength={100}
          value={
            form.email
          }
          onChange={
            onChange
          }
          placeholder="Enter email address"
          className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
        />

      </div>


      {/* Payment Terms */}

      <div>

        <label className="block text-slate-600 mb-1 font-medium">
          Payment Terms
        </label>

        <input
          type="text"
          name="payment_terms"
          maxLength={100}
          value={
            form.payment_terms
          }
          onChange={
            onChange
          }
          placeholder="e.g. Net 30"
          className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
        />

      </div>


      {/* Tax ID */}

      <div>

        <label className="block text-slate-600 mb-1 font-medium">
          Tax ID
        </label>

        <input
          type="text"
          name="tax_id"
          maxLength={50}
          value={
            form.tax_id
          }
          onChange={
            onChange
          }
          placeholder="Enter tax ID"
          className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500"
        />

      </div>


      {/* Address */}

      <div>

        <label className="block text-slate-600 mb-1 font-medium">
          Address
        </label>

        <textarea
          name="address"
          rows="3"
          value={
            form.address
          }
          onChange={
            onChange
          }
          placeholder="Enter supplier address"
          className="w-full border rounded-lg p-2 bg-slate-50 text-slate-700 outline-none focus:border-cyan-500 resize-none"
        />

      </div>


      {/* Active */}

      <div className="flex items-center gap-2">

        <input
          type="checkbox"
          name="is_active"
          checked={
            form.is_active
          }
          onChange={
            onChange
          }
          className="w-4 h-4"
        />

        <label className="text-slate-600">
          Supplier is Active
        </label>

      </div>


      {/* Buttons */}

      <div className="flex justify-end gap-2 pt-2">

        <button
          type="button"
          onClick={
            onCancel
          }
          disabled={
            saving
          }
          className="px-3 py-1.5 border rounded-lg text-slate-600 disabled:opacity-50"
        >
          Cancel
        </button>


        <button
          type="submit"
          disabled={
            saving
          }
          className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 disabled:opacity-50 inline-flex items-center gap-1.5"
        >

          {saving && (

            <Loader2
              size={14}
              className="animate-spin"
            />

          )}

          {saving
            ? "Saving..."
            : submitText}

        </button>

      </div>

    </form>

  );

}


// =====================================================
// SUPPLIER DETAIL ROW
// =====================================================

function SupplierDetail({
  label,
  value,
}) {

  return (

    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">

      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-semibold text-slate-800 text-right break-all">
        {value}
      </span>

    </div>

  );

}