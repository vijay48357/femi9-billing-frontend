import { useState, useEffect, useRef } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import "../../billing-application.scss";

// ── Types ─────────────────────────────────────────────────────────────────────
type LocationType = "Business" | "Warehouse";
type SortKey = "name" | "defaultTxnSeries" | "type" | "address";
type SortDir = "asc" | "desc";

type SeriesModule = { module: string; prefix: string; startingNumber: string; };

type TxnSeries = {
    id: number; name: string; locations: string[]; modules: SeriesModule[];
};

type Location = {
    id: number;
    name: string;
    type: LocationType;
    parentLocation: string;   // Warehouse only
    address: string; street1: string; street2: string;
    city: string; pinCode: string; country: string; state: string;
    phone: string; fax: string; websiteUrl: string;
    primaryContact: string;
    txnSeries: string[];          // Business only
    defaultTxnSeries: string;    // Business only
    isDefault?: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_MODULES: SeriesModule[] = [
    { module: "Credit Note",      prefix: "CN-",  startingNumber: "00001" },
    { module: "Customer Payment", prefix: "",      startingNumber: "1" },
    { module: "Purchase Order",   prefix: "PO-",  startingNumber: "00001" },
    { module: "Sales Order",      prefix: "SO-",  startingNumber: "00001" },
    { module: "Vendor Payment",   prefix: "",      startingNumber: "1" },
    { module: "Retainer Invoice", prefix: "RET-", startingNumber: "00001" },
    { module: "Bill Of Supply",   prefix: "BOS-", startingNumber: "000001" },
    { module: "Invoice",          prefix: "INV-", startingNumber: "000001" },
    { module: "Sales Return",     prefix: "RMA-", startingNumber: "00001" },
    { module: "Delivery Challan", prefix: "DC-",  startingNumber: "00001" },
];

const INIT_SERIES: TxnSeries[] = [
    { id: 1, name: "Default Transaction Series", locations: ["Head Office"], modules: DEFAULT_MODULES.map(m => ({ ...m })) },
    { id: 2, name: "1", locations: ["erode"], modules: DEFAULT_MODULES.map(m => ({ ...m })) },
];

const INIT_LOCATIONS: Location[] = [
    { id: 1, name: "Head Office", type: "Business", parentLocation: "", address: "Vijay Vijay", street1: "", street2: "", city: "", pinCode: "", country: "India", state: "Tamil Nadu", phone: "", fax: "", websiteUrl: "", primaryContact: "vijay48357@gmail.com", txnSeries: ["Default Transaction Series"], defaultTxnSeries: "Default Transaction Series", isDefault: true },
    { id: 2, name: "erode",       type: "Business", parentLocation: "", address: "",            street1: "", street2: "", city: "namakkal", pinCode: "", country: "India", state: "Tamil Nadu", phone: "", fax: "", websiteUrl: "", primaryContact: "", txnSeries: ["1"], defaultTxnSeries: "1" },
];

const EMPTY_LOC: Omit<Location, "id"> = {
    name: "", type: "Business", parentLocation: "", address: "", street1: "", street2: "",
    city: "", pinCode: "", country: "India", state: "", phone: "", fax: "", websiteUrl: "",
    primaryContact: "", txnSeries: ["Default Transaction Series"], defaultTxnSeries: "Default Transaction Series", isDefault: false,
};

const pvw = (p: string, n: string) => p ? `${p}${n}` : n;
const now = () => new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ── Shared Styles ─────────────────────────────────────────────────────────────
const inp: React.CSSProperties = { border: "1px solid #e3e3e3", borderRadius: 6, padding: "7px 11px", fontSize: 13, outline: "none", width: "100%", color: "#333" };
const lbl = (req = false): React.CSSProperties => ({ fontSize: 13, fontWeight: 500, marginBottom: 5, display: "block", color: req ? "#e41f07" : "#444" });
const thStyle: React.CSSProperties = { padding: "13px 16px", fontWeight: 600, color: "#000000", fontSize: 13, background: "#fff", borderBottom: "1px solid #e8e8e8", whiteSpace: "nowrap", userSelect: "none" };const tdStyle: React.CSSProperties = { padding: "14px 16px", fontSize: 13, color: "#444", verticalAlign: "middle" };

// ── Sort Icon ─────────────────────────────────────────────────────────────────
const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir; }) => (
    <span style={{ marginLeft: 4, display: "inline-flex", flexDirection: "column", gap: 1, verticalAlign: "middle" }}>
        <span style={{ fontSize: 8, lineHeight: 1, color: sortKey === col && sortDir === "asc" ? "#e41f07" : "#ccc" }}>▲</span>
        <span style={{ fontSize: 8, lineHeight: 1, color: sortKey === col && sortDir === "desc" ? "#e41f07" : "#ccc" }}>▼</span>
    </span>
);

// ── Multi-tag Series Select ───────────────────────────────────────────────────
const SeriesMultiSelect = ({ value, onChange, options, label, required }: {
    value: string[]; onChange: (v: string[]) => void; options: string[]; label: string; required?: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);
    const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
    return (
        <div style={{ marginBottom: 14, position: "relative" }} ref={ref}>
            <label style={lbl(required)}>{label}{required && " *"}</label>
            <div onClick={() => setOpen(o => !o)} style={{ ...inp, minHeight: 38, cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", paddingRight: 30 }}>
                {value.length === 0 ? <span style={{ color: "#bbb" }}>Select series…</span>
                    : value.map(v => (
                        <span key={v} style={{ background: "#fff0ee", color: "#e41f07", borderRadius: 4, padding: "2px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                            {v}<span onClick={e => { e.stopPropagation(); toggle(v); }} style={{ cursor: "pointer", fontWeight: 700, fontSize: 14 }}>×</span>
                        </span>
                    ))}
                <i className="ti ti-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 13 }} />
            </div>
            {open && (
                <div style={{ border: "1px solid #e3e3e3", borderRadius: 8, background: "#fff", position: "absolute", zIndex: 400, width: "100%", maxHeight: 200, overflowY: "auto", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", marginTop: 3 }}>
                    {options.map(opt => (
                        <div key={opt} onClick={() => toggle(opt)} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8, background: value.includes(opt) ? "#fff8f7" : "#fff", color: value.includes(opt) ? "#e41f07" : "#333", borderBottom: "1px solid #f5f5f5" }}>
                            <input type="checkbox" readOnly checked={value.includes(opt)} style={{ accentColor: "#e41f07", cursor: "pointer" }} />{opt}
                        </div>
                    ))}
                    {options.length === 0 && <div style={{ padding: "10px 14px", color: "#bbb", fontSize: 13 }}>No series available</div>}
                </div>
            )}
        </div>
    );
};

// ── Action Menu ───────────────────────────────────────────────────────────────
const ActionMenu = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void; }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);
    return (
        <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
            <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontSize: 18, color: "#888" }}>⋮</button>
            {open && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid #e3e3e3", borderRadius: 8, width: 160, boxShadow: "0 6px 20px rgba(0,0,0,0.1)", zIndex: 300, padding: "4px 0" }}>
                    {[{ icon: "ti-pencil", label: "Edit", fn: onEdit }, { icon: "ti-trash", label: "Delete", fn: onDelete }].map(item => (
                        <button key={item.label} onClick={() => { item.fn(); setOpen(false); }}
                            className="dropdown-item d-flex align-items-center gap-2 px-3 py-2" style={{ fontSize: 13, color: "#444" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#fff8f7")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}>
                            <i className={`ti ${item.icon}`} style={{ color: "#e41f07", fontSize: 15 }} />{item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Delete Modal ──────────────────────────────────────────────────────────────
const DeleteModal = ({ show, name, onConfirm, onClose }: { show: boolean; name: string; onConfirm: () => void; onClose: () => void; }) => {
    if (!show) return null;
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1050, background: "#fff", borderRadius: 12, width: "min(420px, calc(100vw - 24px))", padding: "36px 24px 28px", boxShadow: "0 16px 48px rgba(0,0,0,0.18)", textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff0ee", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                    <i className="ti ti-trash" style={{ fontSize: 28, color: "#e41f07" }} />
                </div>
                <h6 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Delete Location</h6>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Are you sure you want to delete <b style={{ color: "#333" }}>{name}</b>?<br /><span style={{ fontSize: 12 }}>This action cannot be undone.</span></p>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={onClose} style={{ background: "#f4f4f4", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                    <button onClick={onConfirm} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Delete</button>
                </div>
            </div>
        </>
    );
};

// ── Import Modal ──────────────────────────────────────────────────────────────
const ImportModal = ({ show, onClose, onImport }: { show: boolean; onClose: () => void; onImport: (rows: Omit<Location, "id">[]) => void; }) => {
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (!show) { setFile(null); setError(""); } }, [show]);

    const downloadTemplate = () => {
        const csv = "Name,Type,ParentLocation,City,State,Country,Phone,PrimaryContact,TransactionSeries,DefaultTransactionSeries\nHead Office,Business,,Chennai,Tamil Nadu,India,9876543210,admin@example.com,Default Transaction Series,Default Transaction Series\n";
        saveAs(new Blob([csv], { type: "text/csv" }), "locations_template.csv");
    };

    const handleFile = (f: File) => {
        if (!f.name.endsWith(".csv")) { setError("Only CSV files are supported."); return; }
        setFile(f); setError("");
    };

    const handleImport = () => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const lines = (e.target?.result as string).split("\n").filter(l => l.trim());
                const rows: Omit<Location, "id">[] = lines.slice(1).map(line => {
                    const [name, type, parentLocation, city, state, country, phone, primaryContact, txnStr, defaultTxn] = line.split(",").map(s => s.trim());
                    return { name, type: (type === "Warehouse" ? "Warehouse" : "Business") as LocationType, parentLocation: parentLocation || "", address: "", street1: "", street2: "", city: city || "", pinCode: "", country: country || "India", state: state || "", phone: phone || "", fax: "", websiteUrl: "", primaryContact: primaryContact || "", txnSeries: txnStr ? [txnStr] : [], defaultTxnSeries: defaultTxn || "", isDefault: false };
                }).filter(r => r.name);
                onImport(rows);
                onClose();
            } catch { setError("Failed to parse file. Please use the template."); }
        };
        reader.readAsText(file);
    };

    if (!show) return null;
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040 }} />
            <div className="import-modal" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1050, background: "#fff", borderRadius: 12, width: 500, boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
                <div style={{ borderBottom: "1px solid #f0f0f0", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h6 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Import Locations</h6>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#999" }}>×</button>
                </div>
                <div style={{ padding: "24px" }}>
                    {/* Template download */}
                    <div style={{ background: "#fff8f7", border: "1px solid #ffd5d0", borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>Download CSV Template</div>
                            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Use this template to fill in your location data</div>
                        </div>
                        <button onClick={downloadTemplate} style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                            <i className="ti ti-download me-1" />Download
                        </button>
                    </div>

                    {/* Drop zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                        onClick={() => fileRef.current?.click()}
                        style={{ border: `2px dashed ${dragging ? "#e41f07" : "#e3e3e3"}`, borderRadius: 10, padding: "36px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "#fff8f7" : "#fafafa", transition: "all 0.15s", marginBottom: 16 }}>
                        <i className="ti ti-upload" style={{ fontSize: 36, color: dragging ? "#e41f07" : "#ccc", display: "block", marginBottom: 10 }} />
                        {file
                            ? <div><div style={{ fontWeight: 600, color: "#333", fontSize: 14 }}>{file.name}</div><div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</div></div>
                            : <div><div style={{ fontWeight: 600, color: "#555", fontSize: 14 }}>Drag & drop CSV file here</div><div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>or click to browse</div></div>
                        }
                        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    </div>
                    {error && <div style={{ color: "#e41f07", fontSize: 12, marginBottom: 12 }}><i className="ti ti-alert-circle me-1" />{error}</div>}
                    <p style={{ fontSize: 12, color: "#aaa", marginBottom: 0 }}>Supported format: CSV · Max 500 rows per import</p>
                </div>
                <div style={{ borderTop: "1px solid #f0f0f0", padding: "14px 24px", display: "flex", gap: 10 }}>
                    <button onClick={handleImport} disabled={!file} style={{ background: file ? "#e41f07" : "#f0f0f0", color: file ? "#fff" : "#aaa", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: file ? "pointer" : "not-allowed", fontSize: 13 }}>Import</button>
                    <button onClick={onClose} style={{ background: "#f4f4f4", color: "#555", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                </div>
            </div>
        </>
    );
};

// ── Location Modal ────────────────────────────────────────────────────────────
const LocationModal = ({ show, onClose, onSave, editData, seriesList, businessLocations }: {
    show: boolean; onClose: () => void; onSave: (d: Omit<Location, "id">) => void;
    editData: Location | null; seriesList: TxnSeries[]; businessLocations: string[];
}) => {
    const [form, setForm] = useState<Omit<Location, "id">>(EMPTY_LOC);
    const [showAddressModal, setShowAddressModal] = useState(false);
    useEffect(() => { setForm(editData ? { ...editData } : { ...EMPTY_LOC }); }, [editData, show]);
    if (!show) return null;
    const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));
    const isWarehouse = form.type === "Warehouse";
    const sNames = seriesList.map(s => s.name);

    const handleTypeChange = (t: LocationType) => {
        set("type", t);
        // Reset type-specific fields when switching
        if (t === "Warehouse") setForm(f => ({ ...f, type: "Warehouse", txnSeries: [], defaultTxnSeries: "" }));
        else setForm(f => ({ ...f, type: "Business", parentLocation: "", txnSeries: ["Default Transaction Series"], defaultTxnSeries: "Default Transaction Series" }));
    };

const addressBlock = (
    <>
        {/* Address field with pencil icon inside */}
        <div style={{ marginBottom: 14 }}>
            <label style={lbl()}>Address</label>
            <div style={{ position: "relative" }}>
                <input
                    style={{ ...inp, paddingRight: 36, backgroundColor: "#f5f5f5", cursor: "default" }}
                    value={form.address}
                    readOnly
                    placeholder="Address"
                />
                <span
                    onClick={() => setShowAddressModal(true)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#e41f07", fontSize: 15, lineHeight: 1 }}
                >
                    <i className="ti ti-pencil" />
                </span>
            </div>
        </div>

        {/* Address Sub-Modal */}
        {showAddressModal && (
            <div className="addr-overlay">
                <div className="addr-modal">
                    <div className="addr-modal-header">
                        <h3>Edit Location Address</h3>
                        <span onClick={() => setShowAddressModal(false)}>×</span>
                    </div>
                    <div className="addr-modal-body">
                        <div className="addr-row">
                            <label style={lbl()}>Attention</label>
                            <input style={inp} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Attention" />
                        </div>
                        <div className="addr-row">
                            <label style={lbl()}>Address</label>
                            <input style={inp} value={form.street1} onChange={e => set("street1", e.target.value)} placeholder="Street 1" />
                            <input style={{ ...inp, marginTop: 6 }} value={form.street2} onChange={e => set("street2", e.target.value)} placeholder="Street 2" />
                        </div>
                        <div className="addr-row-2">
                            <div>
                                <label style={lbl()}>City</label>
                                <input style={inp} value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" />
                            </div>
                            <div>
                                <label style={lbl()}>Pin Code</label>
                                <input style={inp} value={form.pinCode} onChange={e => set("pinCode", e.target.value)} placeholder="Pin Code" />
                            </div>
                        </div>
                        <div className="addr-row">
                            <label style={lbl()}>Country/Region</label>
                            <div className="sel-wrap">
                                <select style={inp} value={form.country} onChange={e => set("country", e.target.value)}>
                                    {["India","United States","United Kingdom","Canada","Australia"].map(c => <option key={c}>{c}</option>)}
                                </select>
                                <i className="ti ti-chevron-down" />
                            </div>
                        </div>
                        <div className="addr-row-2">
                            <div>
                                <label style={lbl()}>State/County</label>
                                <input style={inp} value={form.state} onChange={e => set("state", e.target.value)} placeholder="State" />
                            </div>
                            <div>
                                <label style={lbl()}>Phone</label>
                                <input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone" />
                            </div>
                        </div>
                        <div className="addr-row">
                            <label style={lbl()}>Fax Number</label>
                            <input style={inp} value={form.fax} onChange={e => set("fax", e.target.value)} placeholder="Fax Number" />
                        </div>
                    </div>
                    <div className="addr-modal-footer">
                        <button className="btn-primary" onClick={() => setShowAddressModal(false)}>Proceed</button>
                        <button className="btn-secondary" onClick={() => setShowAddressModal(false)}>Cancel</button>
                    </div>
                </div>
            </div>
        )}
    </>
);

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040 }} />
            <div className="loc-modal" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1050, background: "#fff", borderRadius: 12, width: 600, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
                {/* Header */}
                <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 2, borderBottom: "1px solid #f0f0f0", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h6 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>{editData ? "Update Location" : "Add Location"}</h6>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#999" }}>×</button>
                </div>

                <div style={{ padding: "20px 24px" }}>
                    {/* Location Type cards */}
                    <div style={{ marginBottom: 18 }}>
                        <label style={lbl()}>Location Type</label>
                        <div style={{ display: "flex", gap: 12 }}>
                            {(["Business", "Warehouse"] as LocationType[]).map(t => {
                                const isSelected = form.type === t;
                                const color = t === "Business" ? "#e41f07" : "#2563eb";
                                const selBg = t === "Business" ? "#fff8f7" : "#f0f6ff";
                                const icon = t === "Business" ? "ti-building-store" : "ti-building-warehouse";
                                return (
                                    <div key={t} onClick={() => handleTypeChange(t)} style={{
                                        flex: 1, border: `2px solid ${isSelected ? color : "#e3e3e3"}`,
                                        borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                                        background: isSelected ? selBg : "#fafafa", transition: "all 0.15s",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                            <div style={{
                                                width: 22, height: 22, borderRadius: "50%",
                                                border: `2px solid ${isSelected ? color : "#ccc"}`,
                                                background: isSelected ? color : "#fff",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                transition: "all 0.15s", flexShrink: 0,
                                            }}>
                                                <i className={`ti ${icon}`} style={{ fontSize: 11, color: isSelected ? "#fff" : "#ccc" }} />
                                            </div>
                                            <span style={{ fontWeight: 600, fontSize: 13, color: isSelected ? color : "#333" }}>{t} Location</span>
                                        </div>
                                        <p style={{ fontSize: 11, color: "#999", margin: 0, lineHeight: 1.5 }}>
                                            {t === "Business"
                                                ? "Used to record transactions, assess regional performance, and monitor stock levels."
                                                : "Refers to where your items are stored. Helps track and monitor stock levels."}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                     {/* Name */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={lbl(true)}>Name *</label>
                        <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Location name" />
                    </div>

                    {/* ── WAREHOUSE ONLY: Parent Location ── */}
                    {isWarehouse && (
                        <div style={{ marginBottom: 14, padding: "14px 16px", background: "#f0f7ff", borderRadius: 8, border: "1px solid #d0e8ff" }}>
                            <label style={{ ...lbl(true), color: "#1565c0" }}>Parent Location *</label>
                            <div style={{ position: "relative" }}>
                            <select style={{ ...inp, borderColor: "#bad5f7", appearance: "none", paddingRight: 32 }} value={form.parentLocation} onChange={e => set("parentLocation", e.target.value)}>
                                <option value="">— Select parent location —</option>
                                {businessLocations.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <i className="ti ti-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#5c8abf", pointerEvents: "none" }} />
                            </div>
                            <p style={{ fontSize: 11, color: "#5c8abf", marginTop: 6, marginBottom: 0 }}>
                                <i className="ti ti-info-circle me-1" />
                                A Warehouse Only Location must be linked to a Business Location as its parent.
                            </p>
                        </div>
                    )}

                    {/* Address */}
                    {addressBlock}

                    {/* Website */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={lbl()}>Website URL</label>
                        <input style={inp} value={form.websiteUrl} onChange={e => set("websiteUrl", e.target.value)} placeholder="https://example.com" />
                    </div>

                    {/* Primary Contact */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={lbl(!isWarehouse)}>Primary Contact{!isWarehouse && " *"}</label>
                        <input style={inp} value={form.primaryContact} onChange={e => set("primaryContact", e.target.value)} placeholder="Email or name" />
                    </div>

                    {/* ── BUSINESS ONLY: Transaction Series ── */}
                    {!isWarehouse && (
                        <>
                            <SeriesMultiSelect
                                label="Transaction Number Series" required
                                value={form.txnSeries} options={sNames}
                                onChange={v => { set("txnSeries", v); if (!v.includes(form.defaultTxnSeries)) set("defaultTxnSeries", v[0] ?? ""); }}
                            />
                            <div style={{ marginBottom: 14 }}>
                                <label style={lbl(true)}>Default Transaction Number Series *</label>
                                <div style={{ position: "relative" }}>
                                <select style={{ ...inp, appearance: "none", paddingRight: 32 }} value={form.defaultTxnSeries} onChange={e => set("defaultTxnSeries", e.target.value)}>
                                    {form.txnSeries.length === 0
                                        ? <option value="">— Select a series above first —</option>
                                        : form.txnSeries.map(s => <option key={s} value={s}>{s}</option>)
                                    }
                                </select>
                                <i className="ti ti-chevron-down" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#888", pointerEvents: "none" }} />
                                </div>
                                <p style={{ fontSize: 11, color: "#999", marginTop: 5, marginBottom: 0 }}>This series is used by default when creating transactions at this location.</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #f0f0f0", padding: "14px 24px", display: "flex", gap: 10 }}>
                    <button onClick={() => { if (form.name.trim()) onSave(form); }}
                        style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Save</button>
                    <button onClick={onClose}
                        style={{ background: "#f4f4f4", color: "#555", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Cancel</button>
                </div>
            </div>
        </>
    );
};

// ── Series Modal ──────────────────────────────────────────────────────────────
const SeriesModal = ({ show, onClose, onSave, editData, locationNames }: {
    show: boolean; onClose: () => void; onSave: (d: Omit<TxnSeries, "id">) => void; editData: TxnSeries | null; locationNames: string[];
}) => {
    const [name, setName] = useState("");
    const [locs, setLocs] = useState<string[]>([]);
    const [modules, setModules] = useState<SeriesModule[]>(DEFAULT_MODULES.map(m => ({ ...m })));
    useEffect(() => {
        if (editData) { setName(editData.name); setLocs(editData.locations); setModules(editData.modules.map(m => ({ ...m }))); }
        else { setName(""); setLocs([]); setModules(DEFAULT_MODULES.map(m => ({ ...m }))); }
    }, [editData, show]);
    if (!show) return null;
    const setMod = (i: number, key: keyof SeriesModule, v: string) => setModules(prev => prev.map((m, idx) => idx === i ? { ...m, [key]: v } : m));
    const toggleLoc = (l: string) => setLocs(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1040 }} />
            <div className="series-modal" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 1050, background: "#fff", borderRadius: 12, width: 740, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
                <div style={{ position: "sticky", top: 0, background: "#fff", zIndex: 2, borderBottom: "1px solid #f0f0f0", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h6 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>{editData ? "Edit Series" : "New Series"}</h6>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#999" }}>×</button>
                </div>
                <div style={{ padding: "20px 24px" }}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={lbl(true)}>Series Name *</label>
                        <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Head Office Series" />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <label style={lbl()}>Location</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {locationNames.map(loc => (
                                <div key={loc} onClick={() => toggleLoc(loc)} style={{ border: `1.5px solid ${locs.includes(loc) ? "#e41f07" : "#e3e3e3"}`, borderRadius: 20, padding: "5px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, background: locs.includes(loc) ? "#fff0ee" : "#fafafa", color: locs.includes(loc) ? "#e41f07" : "#555", transition: "all 0.15s" }}>
                                    {locs.includes(loc) && "× "}{loc}
                                </div>
                            ))}
                            {locationNames.length === 0 && <span style={{ fontSize: 12, color: "#bbb" }}>No locations yet</span>}
                        </div>
                    </div>
                    <div style={{ border: "1px solid #e8e8e8", borderRadius: 10, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: "#f8f9fa" }}>
                                  {["Module", "Prefix", "Starting Number", "Preview"].map(h => (
                                 <th key={h} style={{ padding: "11px 16px", fontWeight: 600, color: "#000000", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, textAlign: "left" }}>{h}</th>
                                  ))}
                                </tr>
                            </thead>
                            <tbody>
                                {modules.map((m, i) => (
                                    <tr key={m.module} style={{ borderTop: "1px solid #f0f0f0" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                        <td style={{ padding: "9px 16px", color: "#333", fontWeight: 500 }}>{m.module}</td>
                                        <td style={{ padding: "9px 16px" }}><input style={{ ...inp, width: 110 }} value={m.prefix} onChange={e => setMod(i, "prefix", e.target.value)} placeholder="e.g. INV-" /></td>
                                        <td style={{ padding: "9px 16px" }}><input style={{ ...inp, width: 110 }} value={m.startingNumber} onChange={e => setMod(i, "startingNumber", e.target.value)} placeholder="00001" /></td>
                                        <td style={{ padding: "9px 16px", fontFamily: "monospace", fontWeight: 700, color: "#e41f07" }}>{pvw(m.prefix, m.startingNumber)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #f0f0f0", padding: "14px 24px", display: "flex", gap: 10 }}>
                    <button onClick={() => { if (name.trim()) onSave({ name: name.trim(), locations: locs, modules }); }}
                        style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Save</button>
                    <button onClick={onClose} style={{ background: "#f4f4f4", color: "#555", border: "none", borderRadius: 8, padding: "9px 28px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Cancel</button>
                </div>
            </div>
        </>
    );
};

// ── Transaction Series View ───────────────────────────────────────────────────
const TxnSeriesView = ({ seriesList, locationNames, onBack, onAdd, onUpdate, onDelete }: {
    seriesList: TxnSeries[]; locationNames: string[]; onBack: () => void;
    onAdd: (d: Omit<TxnSeries,"id">) => void; onUpdate: (id: number, d: Omit<TxnSeries,"id">) => void; onDelete: (id: number) => void;
}) => {
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState<TxnSeries | null>(null);
    const [delTarget, setDelTarget] = useState<TxnSeries | null>(null);
    const handleSave = (d: Omit<TxnSeries,"id">) => { if (editData) onUpdate(editData.id, d); else onAdd(d); setShowModal(false); setEditData(null); };
    return (
        <div className="page-wrapper"><div className="content">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={onBack} style={{ background: "#fff0ee", border: "none", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#e41f07", fontSize: 18 }}>
                        <i className="ti ti-arrow-left" />
                    </button>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <h4 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Transaction Number Series</h4>
                            <span style={{ background: "#e41f07", color: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{seriesList.length}</span>
                        </div>
                        <nav style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>
                            <span style={{ cursor: "pointer", color: "#e41f07" }} onClick={onBack}>Locations</span>
                            <span style={{ margin: "0 5px" }}>›</span><span>Transaction Series</span>
                        </nav>
                    </div>
                </div>
                <button onClick={() => { setEditData(null); setShowModal(true); }}
                    style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-plus" />New Series
                </button>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden", border: "1px solid #f0f0f0" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Series Name</th>
                                <th style={thStyle}>Location</th>
                                {DEFAULT_MODULES.slice(0, 4).map(m => <th key={m.module} style={thStyle}>{m.module}</th>)}
                                <th style={{ ...thStyle, textAlign: "center" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {seriesList.map(s => (
                                <tr key={s.id} style={{ borderBottom: "1px solid #f5f5f5" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#fafcff")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                    <td style={tdStyle}><span style={{ color: "#e41f07", fontWeight: 600, cursor: "pointer" }} onClick={() => { setEditData(s); setShowModal(true); }}>{s.name}</span></td>
                                    <td style={tdStyle}>{s.locations.join(", ") || <span style={{ color: "#bbb" }}>—</span>}</td>
                                    {s.modules.slice(0, 4).map(m => <td key={m.module} style={{ ...tdStyle, fontFamily: "monospace", color: "#555" }}>{pvw(m.prefix, m.startingNumber)}</td>)}
                                    <td style={{ ...tdStyle, textAlign: "center" }}>
                                        <ActionMenu onEdit={() => { setEditData(s); setShowModal(true); }} onDelete={() => setDelTarget(s)} />
                                    </td>
                                </tr>
                            ))}
                            {seriesList.length === 0 && <tr><td colSpan={8} style={{ ...tdStyle, textAlign: "center", padding: 48, color: "#bbb" }}>No series yet. Click "New Series" to add one.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
            <SeriesModal show={showModal} onClose={() => { setShowModal(false); setEditData(null); }} onSave={handleSave} editData={editData} locationNames={locationNames} />
            <DeleteModal show={!!delTarget} name={delTarget?.name ?? ""} onConfirm={() => { if (delTarget) { onDelete(delTarget.id); setDelTarget(null); } }} onClose={() => setDelTarget(null)} />
        </div></div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const LocationPage = () => {
    const [view, setView] = useState<"locations" | "series">("locations");
    const [locations, setLocations] = useState<Location[]>(INIT_LOCATIONS);
    const [seriesList, setSeriesList] = useState<TxnSeries[]>(INIT_SERIES);
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [showLocModal, setShowLocModal] = useState(false);
    const [editLoc, setEditLoc] = useState<Location | null>(null);
    const [delTarget, setDelTarget] = useState<Location | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false); };
        document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);

    const handleSort = (key: SortKey) => { if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("asc"); } };

    const filtered = locations
        .filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.type.toLowerCase().includes(search.toLowerCase()) || l.city.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const av = sortKey === "name" ? a.name : sortKey === "defaultTxnSeries" ? a.defaultTxnSeries : sortKey === "type" ? a.type : [a.city, a.state].join("");
            const bv = sortKey === "name" ? b.name : sortKey === "defaultTxnSeries" ? b.defaultTxnSeries : sortKey === "type" ? b.type : [b.city, b.state].join("");
            return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        });

    const allSelected = filtered.length > 0 && filtered.every(l => selected.includes(l.id));

    // ── Export PDF ────────────────────────────────────────────────────────────
    const exportPDF = () => {
        const rows = selected.length > 0 ? filtered.filter(l => selected.includes(l.id)) : filtered;
        const date = now();
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Locations</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a2e}
.header{background:#1a1a2e;color:white;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}
.brand{font-size:22px;font-weight:800;color:#e41f07}.bar{height:4px;background:#e41f07}
.title-strip{padding:14px 32px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}
.title-strip h2{font-size:18px;font-weight:700}.badge{background:#e41f07;color:white;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin-left:10px}
.stats{display:flex;gap:12px;padding:14px 32px;background:#f8f9fa;border-bottom:1px solid #e5e7eb}
.stat{flex:1;background:white;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
.stat .v{font-size:22px;font-weight:700;color:#e41f07}.stat .l{font-size:10px;color:#6b7280;text-transform:uppercase}
.wrap{padding:20px 32px}table{width:100%;border-collapse:collapse}
thead tr{background:#e41f07}thead th{color:white;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase}
tbody td{padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px}
.pill{padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.footer{margin:0 32px;padding:12px 0;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;display:flex;justify-content:space-between}
@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body>
<div class="header"><div><div class="brand">CRMS</div><div style="color:#94a3b8;font-size:12px;margin-top:4px">Locations</div></div>
<div style="font-size:11px;color:#94a3b8;text-align:right">Generated: ${date}</div></div>
<div class="bar"></div>
<div class="title-strip"><div style="display:flex;align-items:center"><h2>Locations</h2><span class="badge">${rows.length}</span></div></div>
<div class="stats">
<div class="stat"><div class="v">${rows.length}</div><div class="l">Total</div></div>
<div class="stat"><div class="v">${rows.filter(l=>l.type==="Business").length}</div><div class="l">Business</div></div>
<div class="stat"><div class="v">${rows.filter(l=>l.type==="Warehouse").length}</div><div class="l">Warehouse</div></div>
</div>
<div class="wrap"><table>
<thead><tr><th>#</th><th>Name</th><th>Type</th><th>Default Series</th><th>Address</th><th>Primary Contact</th></tr></thead>
<tbody>${rows.map((l, i) => `<tr style="background:${i%2===0?"#fff":"#fff5f4"}">
<td style="color:#9ca3af">${i+1}</td>
<td style="font-weight:600">${l.name}${l.isDefault?" ★":""}</td>
<td><span class="pill" style="background:${l.type==="Business"?"#e8f5e9":"#e3f2fd"};color:${l.type==="Business"?"#2e7d32":"#1565c0"}">${l.type}</span></td>
<td>${l.defaultTxnSeries||"—"}</td>
<td>${[l.city,l.state,l.country].filter(Boolean).join(", ")||"—"}</td>
<td>${l.primaryContact||"—"}</td>
</tr>`).join("")}</tbody></table></div>
<div class="footer"><span>CRMS · Locations</span><span>Exported on ${date}</span></div>
<script>window.onload=()=>window.print();</script></body></html>`;
        const win = window.open("", "_blank", "width=1100,height=750");
        if (win) { win.document.write(html); win.document.close(); }
        setExportOpen(false);
    };

    // ── Export Excel ──────────────────────────────────────────────────────────
    const exportExcel = async () => {
        const rows = selected.length > 0 ? filtered.filter(l => selected.includes(l.id)) : filtered;
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Locations");
        ws.columns = [
            { header: "Name", key: "name", width: 22 },
            { header: "Type", key: "type", width: 14 },
            { header: "Parent Location", key: "parentLocation", width: 20 },
            { header: "Default Transaction Series", key: "defaultTxnSeries", width: 30 },
            { header: "City", key: "city", width: 16 },
            { header: "State", key: "state", width: 16 },
            { header: "Country", key: "country", width: 16 },
            { header: "Phone", key: "phone", width: 16 },
            { header: "Primary Contact", key: "primaryContact", width: 28 },
        ];
        const headerRow = ws.getRow(1);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE41F07" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });
        headerRow.height = 22;
        rows.forEach((l, i) => {
            const row = ws.addRow({ name: l.name, type: l.type, parentLocation: l.parentLocation || "", defaultTxnSeries: l.defaultTxnSeries || "", city: l.city, state: l.state, country: l.country, phone: l.phone, primaryContact: l.primaryContact });
            const bg = i % 2 === 0 ? "FFFFFFFF" : "FFFFF5F4";
            row.eachCell(cell => { cell.font = { name: "Arial", size: 10 }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }; cell.alignment = { vertical: "middle" }; });
            row.height = 18;
        });
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "locations.xlsx");
        setExportOpen(false);
    };

    const handleSaveLoc = (form: Omit<Location,"id">) => {
        if (!form.name.trim()) return;
        if (editLoc) setLocations(prev => prev.map(l => l.id === editLoc.id ? { ...form, id: editLoc.id } : l));
        else setLocations(prev => [...prev, { ...form, id: Math.max(0, ...prev.map(l => l.id)) + 1 }]);
        setShowLocModal(false); setEditLoc(null);
    };

    const handleDelLoc = () => { if (delTarget) { setLocations(prev => prev.filter(l => l.id !== delTarget.id)); setDelTarget(null); } };
    const addSeries    = (d: Omit<TxnSeries,"id">) => setSeriesList(prev => [...prev, { ...d, id: Math.max(0,...prev.map(s=>s.id))+1 }]);
    const updateSeries = (id: number, d: Omit<TxnSeries,"id">) => setSeriesList(prev => prev.map(s => s.id===id ? {...d,id} : s));
    const deleteSeries = (id: number) => setSeriesList(prev => prev.filter(s => s.id!==id));

    const businessLocations = locations.filter(l => l.type === "Business").map(l => l.name);

    if (view === "series") {
        return <TxnSeriesView seriesList={seriesList} locationNames={locations.map(l=>l.name)} onBack={() => setView("locations")} onAdd={addSeries} onUpdate={updateSeries} onDelete={deleteSeries} />;
    }

    const SortTh = ({ col, label }: { col: SortKey; label: string }) => (
        <th onClick={() => handleSort(col)} style={{ ...thStyle, cursor: "pointer" }}>
            {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
        </th>
    );
    

    return (
        <div className="page-wrapper">
            <div className="content">

                {/* ── Page Header ── */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <h4 style={{ margin: 0, fontWeight: 700, fontSize: 24, color: "#1a1a2e" }}>Locations</h4>
                            <span style={{ background: "#e41f07", color: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{locations.length}</span>
                        </div>
                        <nav style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                            <span>Home</span><span style={{ margin: "0 6px" }}>›</span>
                            <span style={{ color: "#e41f07", fontWeight: 500 }}>Locations</span>
                        </nav>
                    </div>

                    {/* Top-right actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      

                        {/* Export dropdown */}
                        <div ref={exportRef} style={{ position: "relative" }}>
                            <button onClick={() => setExportOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e3e3e3", background: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#444" }}>
                                <i className="ti ti-package-export" style={{ fontSize: 16, color: "#666" }} />Export
                                <i className="ti ti-chevron-down" style={{ fontSize: 13, color: "#999" }} />
                            </button>
                            {exportOpen && (
                                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e3e3e3", borderRadius: 8, width: 190, boxShadow: "0 6px 20px rgba(0,0,0,0.1)", zIndex: 300, padding: "4px 0" }}>
                                    <button onClick={exportPDF} className="dropdown-item d-flex align-items-center gap-2 px-3 py-2" style={{ fontSize: 13, color: "#444", width: "100%" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#fff8f7")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                        <i className="ti ti-file-type-pdf" style={{ color: "#e41f07", fontSize: 16 }} />Export as PDF
                                    </button>
                                    <button onClick={exportExcel} className="dropdown-item d-flex align-items-center gap-2 px-3 py-2" style={{ fontSize: 13, color: "#444", width: "100%" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#fff8f7")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                        <i className="ti ti-file-spreadsheet" style={{ color: "#1d6f42", fontSize: 16 }} />Export as Excel
                                    </button>
                                    {selected.length > 0 && (
                                        <div style={{ padding: "6px 12px", borderTop: "1px solid #f5f5f5", fontSize: 11, color: "#e41f07", fontWeight: 600 }}>
                                            {selected.length} selected row{selected.length > 1 ? "s" : ""} will be exported
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button title="Refresh" onClick={() => setSearch("")} style={{ border: "1px solid #e3e3e3", background: "#fff", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <i className="ti ti-refresh" style={{ fontSize: 16, color: "#666" }} />
                        </button>
                        <button title="Import" onClick={() => setShowImport(true)} style={{ border: "1px solid #e3e3e3", background: "#fff", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <i className="ti ti-upload" style={{ fontSize: 16, color: "#666" }} />
                        </button>
                    </div>
                </div>

                {/* ── Table Card ── */}
                <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0", overflow: "hidden" }}>
                    {/* Toolbar */}
                    <div className="mobile-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f0f0f0", flexWrap: "wrap", gap: 10 }}>
                  <div className="input-icon input-icon-start position-relative">
                     <span className="input-icon-addon text-dark">
                      <i className="ti ti-search"></i>
                    </span>
 
                     <input    type="text"
                      className="form-control"
                       placeholder="Search locations..."
                      value={search || ""}
                   onChange={(e) => setSearch(e.target.value)}
                        />
                  </div>

                   <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  
                      <button
                       onClick={() => setView("series")}
                      style={{display: "flex",alignItems: "center", gap: 6,border: "1px solid #e3e3e3",background: "#fff",borderRadius: 8, padding: "9px 20px", fontSize: 13,fontWeight: 500,cursor: "pointer",color: "#e41f07"}}>
                      <i className="ti ti-settings" style={{ fontSize: 16 }} />
                      Transaction Series
                     </button>
                     <button
                       className="mobile-button"
                       onClick={() => {
                       setEditLoc(null);
                        setShowLocModal(true);
                      }}
                       style={{ background: "#e41f07", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                      <i className="ti ti-plus" style={{ fontSize: 16 }} />
                   Add Location
                 </button>

                    </div>
                    </div>

                    {/* Table */}
                    <div className="loc-table-wrapper" style={{ overflowX: "auto" }}>
                        <table className="loc-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr>
                                    <th style={{ ...thStyle, width: 46, textAlign: "center" }}>
                                        <input type="checkbox" checked={allSelected} style={{ cursor: "pointer", accentColor: "#e41f07" }}
                                            onChange={() => setSelected(allSelected ? [] : filtered.map(l => l.id))} />
                                    </th>
                                    <SortTh col="name" label="Name" />
                                    <SortTh col="defaultTxnSeries" label="Default Transaction Series" />
                                    <SortTh col="type" label="Type" />
                                    <SortTh col="address" label="Address Details" />
                                    <th style={{ ...thStyle, textAlign: "center" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", padding: 56, color: "#bbb" }}>
                                        <i className="ti ti-map-pin-off" style={{ fontSize: 36, display: "block", marginBottom: 10, color: "#ddd" }} />
                                        No locations found.
                                    </td></tr>
                                ) : filtered.map(loc => (
                                    <tr key={loc.id} style={{ borderBottom: "1px solid #f5f5f5" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#fafcff")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                        <td className="checkbox-cell" style={{ ...tdStyle, textAlign: "center" }}>
                                            <input type="checkbox" checked={selected.includes(loc.id)} style={{ cursor: "pointer", accentColor: "#e41f07" }}
                                                onChange={() => setSelected(prev => prev.includes(loc.id) ? prev.filter(x => x !== loc.id) : [...prev, loc.id])} />
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: loc.type === "Warehouse" ? "#e3f2fd" : "#fff0ee", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    <i className={`ti ${loc.type === "Warehouse" ? "ti-building-warehouse" : "ti-map-pin"}`} style={{ fontSize: 16, color: loc.type === "Warehouse" ? "#1565c0" : "#e41f07" }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 5 }}>
                                                        {loc.name}{loc.isDefault && <i className="ti ti-star-filled" style={{ color: "#f5a623", fontSize: 13 }} />}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#aaa" }}>
                                                        {loc.type === "Warehouse" && loc.parentLocation ? `Parent: ${loc.parentLocation}` : `${loc.type} Location`}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            {loc.defaultTxnSeries
                                                ? <span style={{ background: "#f0f4ff", color: "#3b5bdb", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 500 }}>{loc.defaultTxnSeries}</span>
                                                : <span style={{ color: "#bbb" }}>—</span>}
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{ background: loc.type === "Business" ? "#e8f5e9" : "#e3f2fd", color: loc.type === "Business" ? "#2e7d32" : "#1565c0", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>{loc.type}</span>
                                        </td>
                                        <td style={{ ...tdStyle, color: "#161616" }}>
                                            {[loc.city, loc.state, loc.country].filter(Boolean).join(", ") || <span style={{ color: "#bbb" }}>—</span>}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "center" }}>
                                            <ActionMenu onEdit={() => { setEditLoc(loc); setShowLocModal(true); }} onDelete={() => setDelTarget(loc)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: "12px 20px", borderTop: "1px solid #f5f5f5", fontSize: 12, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>Showing {filtered.length} of {locations.length} locations</span>
                        {selected.length > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ color: "#e41f07", fontWeight: 600 }}>{selected.length} selected</span>
                                <button onClick={() => setSelected([])} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12 }}>Clear</button>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <LocationModal show={showLocModal} onClose={() => { setShowLocModal(false); setEditLoc(null); }} onSave={handleSaveLoc} editData={editLoc} seriesList={seriesList} businessLocations={businessLocations} />
            <DeleteModal show={!!delTarget} name={delTarget?.name ?? ""} onConfirm={handleDelLoc} onClose={() => setDelTarget(null)} />
            <ImportModal show={showImport} onClose={() => setShowImport(false)} onImport={rows => { const nextId = Math.max(0, ...locations.map(l => l.id)); setLocations(prev => [...prev, ...rows.map((r, i) => ({ ...r, id: nextId + i + 1 }))]); }} />
        </div>
    );
};

export default LocationPage;