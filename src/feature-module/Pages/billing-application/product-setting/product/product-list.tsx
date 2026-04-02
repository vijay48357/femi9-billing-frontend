import { useState, useRef, useEffect } from "react";
import "../../billing-application.scss";
import Footer from "../../../../../components/footer/footer";
import ExcelJS from "exceljs";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import PageHeader from "../../../../../components/page-header/pageHeader";
import { all_routes } from "../../../../../routes/all_routes";
import { productService } from "../../../../../api/productService";

const route = all_routes;

// Resolve backend image paths (handles "storage:path" and "image/path" prefixes)
const resolveImageUrl = (path?: string): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    if (path.startsWith('storage:')) return '/storage/' + path.slice('storage:'.length);
    return '/' + path;
};

type Item = {
    id: number;
    name: string;
    sku: string;
    stockOnHand: number;
    reorderLevel: number;
    status: "active" | "inactive";
    isSingle: boolean;
    isReturnable: boolean;
    hasSku: boolean;
    image?: string;
    // New fields 
    unit?: string;
    brand?: string;
    category?: string;
    manufacturer?: string;
    weight?: string;
    weightUnit?: string;
    dimensions?: string;
    dimensionUnit?: string;
    costPrice?: number;
    selling_price?: number;
    purchaseAccount?: string;
    salesAccount?: string;
    inventoryAccount?: string;
    preferredVendor?: string;
    purchaseDescription?: string;
    salesDescription?: string;
    itemType?: string;
    openingStockRate?: number;
};

// ── Search Form Type ─────────────────────────────────────────────────────────
type SearchForm = {
    itemName: string;
    sku: string;
    category: string;
    description: string;
    manufacturer: string;
    brand: string;
    ean: string;
    upc: string;
    mpn: string;
    isbn: string;
    rate: string;
    purchaseRate: string;
    status: string;
    taxExemptions: string;
};

const DEFAULT_SEARCH: SearchForm = {
    itemName: "", sku: "", category: "", description: "",
    manufacturer: "", brand: "", ean: "", upc: "",
    mpn: "", isbn: "", rate: "", purchaseRate: "",
    status: "All", taxExemptions: "",
};

const VIEWS = [
    { key: "all", label: "All Items" },
    { key: "active", label: "Active Items" },
    { key: "inactive", label: "Inactive Items" },
    { key: "single", label: "Single Items" },
    { key: "lowstock", label: "Low Stock Items" },
    { key: "sales", label: "Sales" },
    { key: "purchases", label: "Purchases" },
    { key: "crmItems", label: "CRM Items" },
    { key: "inventory", label: "Inventory Items" },
    { key: "nonInventory", label: "Non-Inventory Items" },
    { key: "services", label: "Services" },
    { key: "binTracked", label: "Bin Tracked Items" },
    { key: "nonSku", label: "Non SKU Items" },
    { key: "uncategorized", label: "Uncategorized Items" },
];

type ViewMode = "list" | "grid";

// ── Export Dropdown Button ───────────────────────────────────────────────────
const ExportDropdown = ({ onExportPDF, onExportExcel }: { onExportPDF: () => void; onExportExcel: () => void; }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);
    return (
        <div ref={ref} className="position-relative">
            <button className="dropdown-toggle btn btn-outline-light px-2 shadow"
                style={{ border: "none", borderRadius: 6, fontWeight: 500 }}
                onClick={() => setOpen(o => !o)}>
                <i className="ti ti-package-export me-2" />Export
            </button>
            {open && (
                <div className="card border shadow-lg position-absolute"
                    style={{ width: 200, zIndex: 500, right: 0, top: "calc(100% + 6px)", borderRadius: 8, overflow: "hidden", padding: "4px 0" }}>
                    <button className="dropdown-item d-flex align-items-center gap-2 px-3 py-2"
                        style={{ fontSize: 13 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#fff5f4")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}
                        onClick={() => { onExportPDF(); setOpen(false); }}>
                        <i className="ti ti-file-type-pdf fs-16" style={{ color: "#e41f07" }} />
                        <span className="text-dark">Export as PDF</span>
                    </button>
                    <button className="dropdown-item d-flex align-items-center gap-2 px-3 py-2"
                        style={{ fontSize: 13 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#fff5f4")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}
                        onClick={() => { onExportExcel(); setOpen(false); }}>
                        <i className="ti ti-file-spreadsheet fs-16" style={{ color: "#16a34a" }} />
                        <span className="text-dark">Export as Excel</span>
                    </button>
                </div>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Search Modal Component ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const SearchModal = ({
    show,
    onClose,
    onSearch,
}: {
    show: boolean;
    onClose: () => void;
    onSearch: (form: SearchForm) => void;
}) => {
    const [form, setForm] = useState<SearchForm>(DEFAULT_SEARCH);
    const [focused, setFocused] = useState<string>("");
    const [searchType, setSearchType] = useState("Items");
    const [filterType, setFilterType] = useState("All Items");
    const itemNameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (show) {
            setForm(DEFAULT_SEARCH);
            setTimeout(() => itemNameRef.current?.focus(), 80);
        }
    }, [show]);

    // Close on ESC key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && show) onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [show, onClose]);

    if (!show) return null;

    const set = (field: keyof SearchForm, val: string) =>
        setForm(prev => ({ ...prev, [field]: val }));

    const inputCls = (field: string) => ({
        width: "100%" as const,
        border: `1.5px solid ${focused === field ? "#e41f07" : "#dee2e6"}`,
        borderRadius: 4,
        padding: "6px 10px",
        fontSize: 13,
        color: "#212529",
        outline: "none",
        background: "white",
        transition: "border-color 0.15s",
        boxSizing: "border-box" as const,
    });

    const selectCls = (field: string) => ({
        ...inputCls(field),
        appearance: "none" as const,
        paddingRight: 28,
        cursor: "pointer",
    });

    const labelCls: React.CSSProperties = {
        fontSize: 13,
        color: "#495057",
        fontWeight: 500,
        textAlign: "right",
        paddingRight: 14,
        whiteSpace: "nowrap",
        paddingTop: 7,
    };

    const Row = ({ label, field, type = "text", options = [] }: {
        label: string; field: keyof SearchForm; type?: string; options?: string[];
    }) => (
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "start", gap: 0 }}>
            <span style={labelCls}>{label}</span>
            <div style={{ position: "relative" }}>
                {type === "select" ? (
                    <>
                        <select
                            value={form[field]}
                            onChange={e => set(field, e.target.value)}
                            onFocus={() => setFocused(field)}
                            onBlur={() => setFocused("")}
                            style={selectCls(field)}
                        >
                            <option value=""></option>
                            {options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <i className="ti ti-chevron-down"
                            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#6c757d", pointerEvents: "none" }} />
                    </>
                ) : (
                    <input
                        ref={field === "itemName" ? itemNameRef : undefined}
                        type="text"
                        value={form[field]}
                        onChange={e => set(field, e.target.value)}
                        onFocus={() => setFocused(field)}
                        onBlur={() => setFocused("")}
                        style={inputCls(field)}
                    />
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.45)",
                    zIndex: 1040,
                    animation: "fadeIn 0.15s ease",
                }}
            />

            {/* Modal */}
            <div style={{
                position: "fixed",
                top: "6%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(860px, 95vw)",
                background: "white",
                borderRadius: 6,
                boxShadow: "0 12px 48px rgba(0,0,0,0.22)",
                zIndex: 1050,
                overflow: "hidden",
                animation: "slideDown 0.18s ease",
            }}>

                {/* ── Header Bar ── */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "13px 20px", borderBottom: "1px solid #dee2e6",
                    background: "#fff",
                }}>
                    <span style={{ fontSize: 14, color: "#333", fontWeight: 500 }}>Search</span>

                    {/* Search type dropdown */}
                    <div style={{ position: "relative" }}>
                        <select value={searchType} onChange={e => setSearchType(e.target.value)}
                            style={{ appearance: "none", border: "1px solid #dee2e6", borderRadius: 4, padding: "5px 28px 5px 10px", fontSize: 13, color: "#333", cursor: "pointer", minWidth: 130, outline: "none" }}>
                            <option>Items</option>
                            <option>Item Groups</option>
                        </select>
                        <i className="ti ti-chevron-down" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#6c757d", pointerEvents: "none" }} />
                    </div>

                    <span style={{ fontSize: 14, color: "#333", fontWeight: 500, marginLeft: 8 }}>Filter</span>

                    {/* Filter type dropdown */}
                    <div style={{ position: "relative" }}>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)}
                            style={{ appearance: "none", border: "1px solid #dee2e6", borderRadius: 4, padding: "5px 28px 5px 10px", fontSize: 13, color: "#333", cursor: "pointer", minWidth: 150, outline: "none" }}>
                            <option>All Items</option>
                            <option>Active Items</option>
                            <option>Inactive Items</option>
                        </select>
                        <i className="ti ti-chevron-down" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#6c757d", pointerEvents: "none" }} />
                    </div>

                    <div style={{ flex: 1 }} />

                    {/* Close button */}
                    <button
                        className="btn rounded-circle d-flex align-items-center justify-content-center p-0 border-0"
                        style={{ width: 20, height: 20, backgroundColor: "#ffe6e6", flexShrink: 0 }}
                        onClick={() => onClose()}
                    >
                        <i className="ti ti-x" style={{ fontSize: 12, color: "#dc3545" }} />
                    </button>
                </div>

                {/* ── Form Grid ── */}
                <div style={{
                    padding: "20px 24px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    columnGap: 20,
                    rowGap: 13,
                }}>
                    {/* Row 1 */}
                    <Row label="Item Name" field="itemName" />
                    <Row label="SKU" field="sku" />

                    {/* Row 2 */}
                    <Row label="Category" field="category" type="select"
                        options={["Electronics", "Accessories", "Storage", "Healthcare", "Clothing"]} />
                    <Row label="Description" field="description" />

                    {/* Row 3 */}
                    <Row label="Manufacturer" field="manufacturer" type="select"
                        options={["Manufacturer A", "Manufacturer B", "Manufacturer C"]} />
                    <Row label="Brand" field="brand" type="select"
                        options={["Brand A", "Brand B", "Brand C"]} />

                    {/* Row 4 */}
                    <Row label="EAN" field="ean" />
                    <Row label="UPC" field="upc" />

                    {/* Row 5 */}
                    <Row label="MPN" field="mpn" />
                    <Row label="ISBN" field="isbn" />

                    {/* Row 6 */}
                    <Row label="Rate" field="rate" />
                    <Row label="Purchase Rate" field="purchaseRate" />

                    {/* Row 7 */}
                    <Row label="Status" field="status" type="select"
                        options={["All", "Active", "Inactive"]} />
                    <Row label="Tax Exemptions" field="taxExemptions" type="select"
                        options={["GST Exempt", "Zero Rated", "Exempt Supply"]} />
                </div>

                {/* ── Footer Buttons ── */}
                <div style={{
                    display: "flex", justifyContent: "center", gap: 10,
                    padding: "14px 24px 20px",
                    borderTop: "1px solid #f0f0f0",
                }}>
                    <button type="button" className="btn px-4 py-2 fw-medium" style={{ backgroundColor: '#e41f07', color: '#fff' }} onClick={() => onSearch(form)}>Search</button>
                    <button type="button" onClick={onClose} className="btn btn-light border px-4 py-2 fw-medium" data-bs-dismiss="modal">Cancel</button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-18px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            `}</style>
        </>
    );
};

const ProductList = () => {
    const navigate = useNavigate();

    const [items, setItems] = useState<Item[]>([]);

    const fetchProducts = async () => {
        try {
            const resp = await productService.getProducts();
            if (resp.data.success) {
                const apiItems = resp.data.data.data.map((p: any) => {
                    const addl = p.additional_data ? (typeof p.additional_data === 'string' ? JSON.parse(p.additional_data) : p.additional_data) : {};
                    const images = p.product_image ? (typeof p.product_image === 'string' ? JSON.parse(p.product_image) : p.product_image) : {};

                    return {
                        id: p.id,
                        name: p.name,
                        sku: p.sku || '',
                        stockOnHand: parseFloat(p.opening_stock || 0),
                        reorderLevel: parseFloat(p.reorder_point || 0),
                        status: p.deleted_at ? "inactive" : "active",
                        isSingle: p.item_variant_type === 'single',
                        isReturnable: !!p.is_returnable,
                        hasSku: !!p.sku,
                        image: images.front_image ? resolveImageUrl(images.front_image) : undefined,
                        // view fields
                        unit: p.unit || 'pcs',
                        brand: p.brand || '--',
                        category: addl.category?.name || '--',
                        manufacturer: addl.manufacturer || '--',
                        weight: addl.weight || '--',
                        weightUnit: addl.weight_unit || 'kg',
                        dimensions: addl.length ? `${addl.length} x ${addl.width} x ${addl.height}` : '--',
                        dimensionUnit: addl.dimension_unit || 'cm',
                        costPrice: parseFloat(p.cost_price || 0),
                        selling_price: parseFloat(p.selling_price || 0),
                        purchaseAccount: addl.account_details?.purchase_account || 'Cost of Goods Sold',
                        salesAccount: addl.account_details?.sales_account || 'Sales',
                        inventoryAccount: addl.account_details?.inventory_account || 'Inventory Asset',
                        preferredVendor: addl.account_details?.preferred_vendor || '--',
                        purchaseDescription: addl.description?.purchase_description || '--',
                        salesDescription: addl.description?.sales_description || '--',
                        itemType: p.type === 'goods' ? 'Inventory Items' : 'Service',
                        openingStockRate: parseFloat(addl.opening_stock_rate || 0)
                    };
                });
                setItems(apiItems);
            }
        } catch (err) {
            console.error("Failed to fetch products", err);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // ... (rest of the component)

    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [activeItemId, setActiveItemId] = useState<number | null>(null);
    const [isSplitView, setIsSplitView] = useState(false);
    const [activeTab, setActiveTab] = useState("Overview");
    const [moreOpen, setMoreOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [rowDensity, setRowDensity] = useState<"expanded" | "collapsed">("expanded");
    const [densityOpen, setDensityOpen] = useState(false);
    const densityRef = useRef<HTMLDivElement>(null);
    const [activeView, setActiveView] = useState("all");
    const [viewSearch, setViewSearch] = useState("");
    const [starred, setStarred] = useState<Set<string>>(new Set(["uncategorized"]));

    // ── Search state ─────────────────────────────────────────────────────────
    const [searchOpen, setSearchOpen] = useState(false);
    const [appliedSearch, setAppliedSearch] = useState<SearchForm | null>(null);

    // ── Sort state ────────────────────────────────────────────────────────────
    const [sortField, setSortField] = useState<"name" | "stock" | "reorder" | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [sortSubmenuOpen, setSortSubmenuOpen] = useState(false);

    // ── Import modal state ────────────────────────────────────────────────────
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);

    // ── Toast state ───────────────────────────────────────────────────────────
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2500); };

    // ── Mobile responsive ─────────────────────────────────────────────────────
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    const filterRef = useRef<HTMLDivElement>(null);
    const moreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) { setFilterOpen(false); setViewSearch(""); }
            if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
            if (densityRef.current && !densityRef.current.contains(e.target as Node)) setDensityOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const [itemImages] = useState<Record<number, string>>({});

    useEffect(() => {
        // Removed focus/sessionStorage reload for API integration
    }, []);

    // ══════════════════════════════════════════════════════════════════════════
    // ── FIXED: Handle Edit Navigation ─────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    const handleEditProduct = (e: React.MouseEvent, productId: number) => {
        e.stopPropagation(); // Prevent parent click events
        e.preventDefault();  // Prevent any default behavior

        // The path should match the route definition. 
        // Based on the file structure, it's likely /billing-application/product-setting/product/edit/:id
        const editPath = route.productEdit
            ? route.productEdit.includes(':id')
                ? route.productEdit.replace(':id', productId.toString())
                : `${route.productEdit}/${productId}`
            : `/billing-application/product-setting/product/edit/${productId}`;

        console.log('Navigating to:', editPath); // Debug log
        navigate(editPath);
    };

    // ── Handle Delete Product ─────────────────────────────────────────────────
    const handleDeleteProduct = async (e: React.MouseEvent, productId: number) => {
        e.stopPropagation();
        e.preventDefault();

        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                const resp = await productService.deleteProduct(productId);
                if (resp.data.success) {
                    setItems(prev => prev.filter(item => item.id !== productId));
                }
            } catch (err) {
                console.error("Delete failed", err);
                alert("Failed to delete product");
            }
        }
    };

    // ── Handle search apply ──────────────────────────────────────────────────
    const handleSearchApply = (form: SearchForm) => {
        setAppliedSearch(form);
        setSearchOpen(false);
    };

    // ── Derived: view filter + search filter ─────────────────────────────────
    const viewFilteredItems = items.filter(item => {
        switch (activeView) {
            case "active": return item.status === "active";
            case "inactive": return item.status === "inactive";
            case "single": return item.isSingle;
            case "lowstock": return item.stockOnHand < item.reorderLevel;
            case "returnable": return item.isReturnable;
            case "nonReturnable": return !item.isReturnable;
            case "nonSku": return !item.hasSku;
            default: return true;
        }
    });

    const filteredItems = viewFilteredItems.filter(item => {
        if (!appliedSearch) return true;
        const f = appliedSearch;
        if (f.itemName && !item.name.toLowerCase().includes(f.itemName.toLowerCase())) return false;
        if (f.sku && !item.sku.toLowerCase().includes(f.sku.toLowerCase())) return false;
        if (f.status && f.status !== "All") {
            if (f.status.toLowerCase() !== item.status) return false;
        }
        return true;
    }).sort((a: Item, b: Item) => {
        if (!sortField) return 0;
        if (sortField === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        if (sortField === "stock") return sortDir === "asc" ? a.stockOnHand - b.stockOnHand : b.stockOnHand - a.stockOnHand;
        if (sortField === "reorder") return sortDir === "asc" ? a.reorderLevel - b.reorderLevel : b.reorderLevel - a.reorderLevel;
        return 0;
    });

    const isSearchActive = appliedSearch !== null && Object.entries(appliedSearch).some(
        ([k, v]) => k === "status" ? v !== "All" : v !== ""
    );

    const currentViewLabel = VIEWS.find(v => v.key === activeView)?.label ?? "All Items";
    const visibleViews = VIEWS.filter(v => v.label.toLowerCase().includes(viewSearch.toLowerCase()));
    const toggleStar = (key: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setStarred(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
    };

    const openDetail = (id: number) => { setActiveItemId(id); setIsSplitView(true); setActiveTab("Overview"); };
    const activeItem = items.find(i => i.id === activeItemId) ?? items[0];

    // ── Export as PDF ─────────────────────────────────────────────────────────
    const exportPDF = () => {
        const exportItems = activeItemId ? items.filter(i => i.id === activeItemId) : filteredItems;
        const isSingle = exportItems.length === 1;
        const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const exportTitle = isSingle ? exportItems[0].name : currentViewLabel;
        const totalStock = exportItems.reduce((s, i) => s + i.stockOnHand, 0).toFixed(2);

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${exportTitle}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a2e}
.header{background:#1a1a2e;color:white;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}
.brand{font-size:22px;font-weight:800;color:#e41f07}.header-bar{height:4px;background:#e41f07}
.title-strip{padding:14px 32px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}
.title-strip h2{font-size:18px;font-weight:700}.badge{background:#e41f07;color:white;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin-left:10px}
.stats{display:flex;gap:16px;padding:14px 32px;background:#f8f9fa;border-bottom:1px solid #e5e7eb}
.stat-card{flex:1;background:white;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;text-align:center}
.stat-card .value{font-size:22px;font-weight:700;color:#e41f07}.stat-card .label{font-size:10px;color:#6b7280;text-transform:uppercase}
.table-wrap{padding:20px 32px}table{width:100%;border-collapse:collapse}
thead tr{background:#e41f07}thead th{color:white;font-size:11px;font-weight:700;padding:10px 12px;text-align:left;text-transform:uppercase}
tbody td{padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px}
.footer{margin:0 32px;padding:12px 0;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;display:flex;justify-content:space-between}
@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body>
<div class="header"><div><div class="brand">CRMS</div><div style="color:#94a3b8;font-size:12px;margin-top:4px">Products</div></div>
<div style="font-size:11px;color:#94a3b8;text-align:right"><div>Generated: ${now}</div></div></div>
<div class="header-bar"></div>
<div class="title-strip"><div style="display:flex;align-items:center"><h2>${exportTitle}</h2><span class="badge">${exportItems.length}</span></div></div>
<div class="stats">
<div class="stat-card"><div class="value">${exportItems.length}</div><div class="label">Total Items</div></div>
<div class="stat-card"><div class="value">${exportItems.filter(i => i.status === "active").length}</div><div class="label">Active</div></div>
<div class="stat-card"><div class="value">${exportItems.filter(i => i.stockOnHand < i.reorderLevel).length}</div><div class="label">Low Stock</div></div>
<div class="stat-card"><div class="value">${totalStock}</div><div class="label">Total Stock</div></div>
</div>
<div class="table-wrap"><table>
<thead><tr><th>#</th><th>Name</th><th>SKU</th><th style="text-align:right">Stock on Hand</th><th style="text-align:right">Reorder Level</th><th style="text-align:center">Status</th></tr></thead>
<tbody>${exportItems.map((item, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#fff5f4"}">
<td style="color:#9ca3af;font-size:11px">${i + 1}</td><td style="font-weight:600">${item.name}</td>
<td style="color:#6b7280;font-family:monospace">${item.sku}</td>
<td style="text-align:right">${item.stockOnHand.toFixed(2)}</td><td style="text-align:right">${item.reorderLevel.toFixed(2)}</td>
<td style="text-align:center"><span style="padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;background:${item.status === "active" ? "#dcfce7" : "#fef3c7"};color:${item.status === "active" ? "#16a34a" : "#d97706"}">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span></td>
</tr>`).join("")}</tbody></table></div>
<div class="footer"><span>CRMS · Product List</span><span>Exported on ${now}</span></div>
<script>window.onload=()=>window.print();</script></body></html>`;
        const win = window.open("", "_blank", "width=1100,height=750");
        if (win) { win.document.write(html); win.document.close(); }
    };

    // ── Export as Excel ───────────────────────────────────────────────────────
    const exportExcel = async () => {
        const exportItems = activeItemId ? items.filter(i => i.id === activeItemId) : filteredItems;
        const sheetName = (activeItemId ? exportItems[0].name : currentViewLabel).substring(0, 31);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
            { header: "Name", key: "name", width: 24 },
            { header: "SKU", key: "sku", width: 20 },
            { header: "Stock on Hand", key: "stockOnHand", width: 18 },
            { header: "Reorder Level", key: "reorderLevel", width: 18 },
            { header: "Status", key: "status", width: 14 },
        ];
        const headerRow = sheet.getRow(1);
        headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE41F07" } };
            cell.alignment = { vertical: "middle", horizontal: "center" };
        });
        headerRow.height = 22;
        exportItems.forEach((item, index) => {
            const row = sheet.addRow({ name: item.name, sku: item.sku, stockOnHand: item.stockOnHand, reorderLevel: item.reorderLevel, status: item.status.charAt(0).toUpperCase() + item.status.slice(1) });
            const bgArgb = index % 2 === 0 ? "FFFFFFFF" : "FFFFF5F4";
            row.eachCell(cell => {
                cell.font = { name: "Arial", size: 10 };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
                cell.alignment = { vertical: "middle" };
            });
            row.height = 18;
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(blob, `${sheetName}.xlsx`);
    };

    // ── Sort options ──────────────────────────────────────────────────────────
    const SORT_OPTIONS = [
        { field: "name" as const, label: "Name A → Z", dir: "asc" as const },
        { field: "name" as const, label: "Name Z → A", dir: "desc" as const },
        { field: "stock" as const, label: "Stock: High → Low", dir: "desc" as const },
        { field: "stock" as const, label: "Stock: Low → High", dir: "asc" as const },
        { field: "reorder" as const, label: "Reorder: High → Low", dir: "desc" as const },
        { field: "reorder" as const, label: "Reorder: Low → High", dir: "asc" as const },
    ];

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <>
            {/* ══ Search Modal ══ */}
            <SearchModal
                show={searchOpen}
                onClose={() => setSearchOpen(false)}
                onSearch={handleSearchApply}
            />

            {/* ══ Toast ══ */}
            {toastMsg && (
                <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#222", color: "#fff", borderRadius: 8, padding: "10px 24px", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", pointerEvents: "none", whiteSpace: "nowrap" }}>
                    <i className="ti ti-check me-2 text-success" />{toastMsg}
                </div>
            )}

            {/* ══ Import Modal ══ */}
            {importModalOpen && (
                <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.4)", zIndex: 1055 }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 460 }}>
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 12 }}>
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bold fs-16">Import Products</h5>
                                <button className="btn-close" onClick={() => { setImportModalOpen(false); setImportFile(null); }} />
                            </div>
                            <div className="modal-body pt-2">
                                <p className="text-muted fs-13 mb-3">Upload a CSV or Excel file to import products in bulk.</p>
                                <div className="border rounded p-4 text-center" style={{ borderStyle: "dashed", borderColor: "#e41f07", background: "#fff5f4", cursor: "pointer" }}
                                    onClick={() => document.getElementById("import-file-input")?.click()}>
                                    <i className="ti ti-file-upload fs-36 mb-2 d-block" style={{ color: "#e41f07" }} />
                                    {importFile ? (
                                        <div className="fw-semibold fs-13 text-dark">{importFile.name}</div>
                                    ) : (
                                        <>
                                            <div className="fw-semibold fs-13 text-dark">Click to browse file</div>
                                            <div className="text-muted fs-12 mt-1">Supported: .csv, .xlsx</div>
                                        </>
                                    )}
                                    <input id="import-file-input" type="file" accept=".csv,.xlsx" className="d-none"
                                        onChange={e => setImportFile(e.target.files?.[0] ?? null)} />
                                </div>
                                <div className="mt-3 d-flex align-items-center gap-2">
                                    <i className="ti ti-info-circle text-muted fs-14" />
                                    <span className="text-muted fs-12">First row should contain column headers: Name, SKU, Stock, Reorder Level</span>
                                </div>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button className="btn btn-light px-4" onClick={() => { setImportModalOpen(false); setImportFile(null); }}>Cancel</button>
                                <button className="btn btn-primary px-4" disabled={!importFile}
                                    onClick={() => { setImportModalOpen(false); setImportFile(null); showToast("Import started — feature coming soon"); }}>
                                    <i className="ti ti-upload me-1" />Import
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <div className="page-wrapper">
                <div className="content pb-0">

                    <PageHeader
                        title="Products"
                        badgeCount={filteredItems.length}
                        showModuleTile={false}
                        showExport={false}
                        exportComponent={<ExportDropdown onExportPDF={exportPDF} onExportExcel={exportExcel} />}
                        onRefresh={fetchProducts}
                    />

                    {isSplitView ? (
                        /* ══ SPLIT VIEW ══ */
                        <div className="card border-0 rounded-0" style={{ height: isMobile ? "calc(100vh - 130px)" : "calc(100vh - 200px)", overflow: "hidden" }}>
                            <div className="d-flex h-100" style={{ minHeight: 0 }}>
                                {/* Left sidebar */}
                                <div style={{ width: 320, borderRight: "1px solid #e3e3e3", display: isMobile ? "none" : "flex", flexDirection: "column", background: "#fff", flexShrink: 0, overflow: "hidden" }}>
                                    <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom">
                                        <span className="fw-semibold fs-15">{currentViewLabel} <span className="text-muted fs-12">▾</span></span>
                                        <div className="ms-auto d-flex gap-1 align-items-center">
                                            <button className="btn btn-primary btn-sm px-3 shadow-sm" onClick={() => navigate(route.product)}><i className="ti ti-square-rounded-plus-filled me-1" />New</button>
                                            <div className="dropdown">
                                                <button className="btn btn-outline-light border shadow-sm btn-sm px-2" data-bs-toggle="dropdown" aria-expanded="false">
                                                    <i className="ti ti-dots-vertical fs-14" />
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-end shadow-sm border py-2" style={{ minWidth: 160 }}>
                                                    <li><a className="dropdown-item py-2 fs-13" href="#" onClick={(e) => { e.preventDefault(); fetchProducts(); }}><i className="ti ti-refresh me-2" /> Refresh List</a></li>
                                                    <li><a className="dropdown-item py-2 fs-13" href="#" onClick={(e) => { e.preventDefault(); exportPDF(); }}><i className="ti ti-file-export me-2" /> Export PDF</a></li>
                                                    <li><a className="dropdown-item py-2 fs-13" href="#" onClick={(e) => { e.preventDefault(); exportExcel(); }}><i className="ti ti-file-spreadsheet me-2" /> Export Excel</a></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hide-scrollbar" style={{ overflowY: "auto", flex: 1 }}>
                                        {filteredItems.map(item => (
                                            <div key={item.id} onClick={() => openDetail(item.id)}
                                                style={{ padding: "10px 16px", borderBottom: "1px solid #f5f5f5", cursor: "pointer", background: activeItemId === item.id ? "#fff5f4" : "#fff", borderLeft: activeItemId === item.id ? "3px solid #e41f07" : "3px solid transparent" }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div style={{ width: 32, height: 32, background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 4, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        {item.image ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <i className="ti ti-photo text-muted" style={{ fontSize: 14 }} />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <span className="fs-13" style={{ fontWeight: activeItemId === item.id ? 600 : 400, color: activeItemId === item.id ? "#e41f07" : "#333" }}>{item.name}</span>
                                                            <span className="text-muted" style={{ fontSize: 11 }}>{item.stockOnHand.toFixed(2)}</span>
                                                        </div>
                                                        <span style={{ fontSize: 11, color: "#bbb" }}>{item.sku}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Right detail */}
                                <div className="hide-scrollbar" style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", overflow: isMobile ? "auto" : "hidden" }}>
                                    {activeItem && (
                                        <>
                                            {/* ── Detail Header ── */}
                                            <div className="d-flex align-items-center justify-content-between px-3 border-bottom bg-white" style={{ height: 60, flexShrink: 0 }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    {isMobile && (
                                                        <button className="btn btn-sm border-0 p-1" onClick={() => setIsSplitView(false)}>
                                                            <i className="ti ti-arrow-left fs-18 text-muted" />
                                                        </button>
                                                    )}
                                                    <h4 className="mb-0 fw-bold fs-15">{activeItem.name}</h4>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <button
                                                        className="btn btn-outline-light border shadow-sm btn-sm px-2"
                                                        style={{ color: "#aaa", transition: "color 0.15s" }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = "#e41f07")}
                                                        onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
                                                        onClick={(e) => handleEditProduct(e, activeItem.id)}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-edit"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" /><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415" /><path d="M16 5l3 3" /></svg>
                                                    </button>

                                                        <div className="dropdown">
                                                            <button className="btn btn-outline-light border shadow-sm btn-sm px-2" data-bs-toggle="dropdown" aria-expanded="false">
                                                                <i className="ti ti-dots-vertical fs-16" />
                                                            </button>
                                                            <ul className="dropdown-menu dropdown-menu-end shadow-sm border py-2" style={{ minWidth: 160 }}>
                                                                <li>
                                                                    <a className="dropdown-item py-2 fs-13 d-flex align-items-center gap-2" href="#" onClick={(e) => handleDeleteProduct(e, activeItem.id)}>
                                                                        <i className="ti ti-trash text-danger fs-16" />
                                                                        <span className="text-danger">Delete</span>
                                                                    </a>
                                                                </li>
                                                            </ul>
                                                        </div>

                                                        <button
                                                            className="btn btn-outline-light border shadow-sm btn-sm px-2"
                                                            style={{ color: "#aaa", transition: "color 0.15s" }}
                                                            onMouseEnter={e => (e.currentTarget.style.color = "#e41f07")}
                                                            onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
                                                            onClick={() => setIsSplitView(false)}
                                                        >
                                                            <i className="ti ti-x fs-16" />
                                                        </button>
                                                </div>
                                            </div>

                                            {/* ── Tabs ── */}
                                            <div className="bg-white border-bottom px-3 hide-scrollbar" style={{ flexShrink: 0, overflowX: "auto" }}>
                                                <ul className="nav nav-tabs border-0 mt-2" style={{ flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                                                    {["Overview", "Locations", "Transactions", "History"].map(tab => (
                                                        <li key={tab} className="nav-item">
                                                            <button
                                                                style={{
                                                                    background: "transparent",
                                                                    border: "none",
                                                                    borderBottom: activeTab === tab ? "3px solid #e41f07" : "3px solid transparent",
                                                                    color: activeTab === tab ? "#e41f07" : "#555",
                                                                    fontWeight: activeTab === tab ? 600 : 500,
                                                                    fontSize: 13,
                                                                    borderRadius: 0,
                                                                    padding: "8px 16px",
                                                                    outline: "none",
                                                                    cursor: "pointer",
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                                onClick={() => setActiveTab(tab)}>{tab}</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* ── Tab Content Container with Right Sidebar ── */}
                                            <div className="d-flex" style={{ flex: isMobile ? "none" : 1, minHeight: 0, flexDirection: isMobile ? "column" : "row" }}>
                                                {/* Main Column */}
                                                <div style={{ flex: isMobile ? "none" : 1, overflowY: isMobile ? "visible" : "auto", overflowX: "hidden", background: "#fcfcfc" }} className="p-3 hide-scrollbar">
                                                    {activeTab === "Overview" && (
                                                        <div className="d-flex flex-column" style={{ gap: isMobile ? 20 : 32 }}>
                                                            {/* Image and Primary Info Row */}
                                                            <div className="d-flex gap-3" style={{ flexDirection: isMobile ? "row" : "row", alignItems: "flex-start", flexWrap: "wrap" }}>
                                                                {/* Image Box */}
                                                                <div style={{ width: isMobile ? 90 : 130, height: isMobile ? 90 : 130, background: "#f8f8f8", border: "1px solid #e3e3e3", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
                                                                    {activeItem.image ? (
                                                                        <img src={activeItem.image} alt={activeItem.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                                                    ) : (
                                                                        <div className="d-flex flex-column align-items-center gap-1">
                                                                            <i className="ti ti-photo text-muted" style={{ fontSize: 40 }} />
                                                                            <span className="text-muted" style={{ fontSize: 11 }}>No Image</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Primary Details Section */}
                                                                <div style={{ flex: 1, width: isMobile ? "100%" : undefined }}>
                                                                    <h5 className="fw-bold fs-15 mb-3 text-dark">Primary Details</h5>
                                                                    <div className="d-flex flex-column gap-3">
                                                                        {[
                                                                            ["Item Name", activeItem.name],
                                                                            ["Item Type", activeItem.itemType],
                                                                            ["SKU", activeItem.sku],
                                                                            ["Category", activeItem.category],
                                                                            ["Unit", activeItem.unit],
                                                                            ["Dimensions", `${activeItem.dimensions ?? ""} ${activeItem.dimensionUnit ?? ""}`.trim()],
                                                                            ["Weight", `${activeItem.weight ?? ""} ${activeItem.weightUnit ?? ""}`.trim()],
                                                                            ["Manufacturer", activeItem.manufacturer],
                                                                            ["Brand", activeItem.brand],
                                                                        ].map(([label, val]) => (
                                                                            <div key={label} className="d-flex align-items-start" style={{ fontSize: 13 }}>
                                                                                <div className="text-muted" style={{ width: 120, flexShrink: 0 }}>{label}</div>
                                                                                <div className="text-dark fw-medium">{val || <span className="text-muted">—</span>}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Purchase Information */}
                                                            <div>
                                                                <h5 className="fw-bold fs-15 mb-3 text-dark">Purchase Information</h5>
                                                                <div className="d-flex flex-column gap-3">
                                                                    <div className="d-flex" style={{ fontSize: 13 }}>
                                                                        <div className="text-muted" style={{ width: 140 }}>Cost Price</div>
                                                                        <div className="text-dark fw-medium">₹{activeItem.costPrice?.toFixed(2)}</div>
                                                                    </div>
                                                                    <div className="d-flex" style={{ fontSize: 13 }}>
                                                                        <div className="text-muted" style={{ width: 140 }}>Purchase Account</div>
                                                                        <div className="text-dark fw-medium">{activeItem.purchaseAccount}</div>
                                                                    </div>
                                                                    <div className="d-flex" style={{ fontSize: 13 }}>
                                                                        <div className="text-muted" style={{ width: 140 }}>Description</div>
                                                                        <div className="text-dark fw-medium">{activeItem.purchaseDescription}</div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Sales Information */}
                                                            <div className="mb-4">
                                                                <h5 className="fw-bold fs-15 mb-3 text-dark">Sales Information</h5>
                                                                <div className="d-flex flex-column gap-3">
                                                                    <div className="d-flex" style={{ fontSize: 13 }}>
                                                                        <div className="text-muted" style={{ width: 140 }}>Selling Price</div>
                                                                        <div className="text-dark fw-medium">₹{activeItem.selling_price?.toFixed(2)}</div>
                                                                    </div>
                                                                    <div className="d-flex" style={{ fontSize: 13 }}>
                                                                        <div className="text-muted" style={{ width: 140 }}>Sales Account</div>
                                                                        <div className="text-dark fw-medium">{activeItem.salesAccount}</div>
                                                                    </div>
                                                                    <div className="d-flex" style={{ fontSize: 13 }}>
                                                                        <div className="text-muted" style={{ width: 140 }}>Description</div>
                                                                        <div className="text-dark fw-medium">{activeItem.salesDescription}</div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Sales Order Summary Section */}
                                                            <div style={{ border: "1px solid #e8e8e8", borderRadius: 8, background: "#fff", overflow: "hidden" }}>
                                                                {/* Header */}
                                                                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, background: "#fafafa" }}>
                                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Sales Order Summary <span style={{ fontWeight: 400, color: "#999" }}>(In INR)</span></span>
                                                                    <div style={{ display: "flex", gap: 8 }}>
                                                                        {[
                                                                            { id: "pipeline", label: "Sales Pipeline", items: ["Marketing Pipeline", "Sales Pipeline"] },
                                                                            { id: "period", label: "This Month", items: ["Last 3 months", "Last 6 months", "Last 12 months"] },
                                                                        ].map(({ id, label, items }) => (
                                                                            <div key={id} className="dropdown">
                                                                                <button
                                                                                    data-bs-toggle="dropdown"
                                                                                    style={{ fontSize: 12, fontWeight: 500, color: "#555", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                                                                >
                                                                                    {label} <i className="ti ti-chevron-down" style={{ fontSize: 11 }} />
                                                                                </button>
                                                                                <div className="dropdown-menu dropdown-menu-end shadow-sm border py-1" style={{ minWidth: 150, fontSize: 13 }}>
                                                                                    {items.map(item => <a key={item} href="#" className="dropdown-item py-2" onClick={e => e.preventDefault()}>{item}</a>)}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Stats Row */}
                                                                <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
                                                                    {[
                                                                        { label: "Direct Sales", value: "₹0.00", icon: "ti-arrow-up-right", color: "#10b981", bg: "#f0fdf4" },
                                                                        { label: "Invoiced", value: "₹0.00", icon: "ti-file-invoice", color: "#3b82f6", bg: "#eff6ff" },
                                                                        { label: "Received", value: "₹0.00", icon: "ti-wallet", color: "#8b5cf6", bg: "#f5f3ff" },
                                                                    ].map(({ label, value, icon, color, bg }, i, arr) => (
                                                                        <div key={label} style={{ flex: 1, padding: "12px 14px", borderRight: i < arr.length - 1 ? "1px solid #f0f0f0" : "none", display: "flex", alignItems: "center", gap: 10 }}>
                                                                            <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                                                <i className={`ti ${icon}`} style={{ fontSize: 14, color }} />
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: 10, color: "#999", fontWeight: 500 }}>{label}</div>
                                                                                <div style={{ fontSize: 14, fontWeight: 700, color: "#222" }}>{value}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Chart placeholder */}
                                                                <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                                                    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 64, opacity: 0.18 }}>
                                                                        {[18, 30, 22, 40, 28, 50, 35, 42, 25, 38, 20, 32].map((h, i) => (
                                                                            <div key={i} style={{ width: 12, height: h, background: "#e41f07", borderRadius: "3px 3px 0 0" }} />
                                                                        ))}
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>No data found.</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {activeTab !== "Overview" && (
                                                        <div className="h-100 d-flex align-items-center justify-content-center text-muted fs-13">
                                                            <div className="text-center">
                                                                <i className="ti ti-database-off fs-40 mb-2 d-block opacity-25" />
                                                                No data available in {activeTab}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Sidebar (Stock Info) */}
                                                <div className="hide-scrollbar" style={{ width: isMobile ? "100%" : 280, borderLeft: isMobile ? "none" : "1px solid #e3e3e3", borderTop: isMobile ? "2px solid #f0f0f0" : "none", background: "#f8f9fa", overflowY: "visible", flexShrink: 0 }}>
                                                    <div className={isMobile ? "p-3 d-flex flex-wrap gap-3" : "p-3"}>
                                                        <div style={{ flex: isMobile ? "1 1 45%" : undefined }} className="mb-4">
                                                            <h6 className="fw-bold fs-12 text-uppercase text-muted mb-3" style={{ letterSpacing: 0.5 }}>Accounting Stock</h6>
                                                            <div className="d-flex flex-column gap-3">
                                                                <div className="d-flex justify-content-between">
                                                                    <span className="text-muted fs-13">Stock on Hand</span>
                                                                    <span className="fw-bold text-dark fs-13">{activeItem.stockOnHand.toFixed(2)}</span>
                                                                </div>
                                                                <div className="d-flex justify-content-between">
                                                                    <span className="text-muted fs-13">Committed Stock</span>
                                                                    <span className="text-dark fs-13">0.00</span>
                                                                </div>
                                                                <div className="d-flex justify-content-between">
                                                                    <span className="text-muted fs-13">Available for Sale</span>
                                                                    <span className="text-dark fs-13">{activeItem.stockOnHand.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div style={{ flex: isMobile ? "1 1 45%" : undefined }} className={isMobile ? "mb-4" : "mb-4 pt-3 border-top"}>
                                                            <h6 className="fw-bold fs-12 text-uppercase text-muted mb-3" style={{ letterSpacing: 0.5 }}>Physical Stock</h6>
                                                            <div className="d-flex flex-column gap-3">
                                                                <div className="d-flex justify-content-between">
                                                                    <span className="text-muted fs-13">Stock on Hand</span>
                                                                    <span className="text-dark fs-13">{activeItem.stockOnHand.toFixed(2)}</span>
                                                                </div>
                                                                <div className="d-flex justify-content-between">
                                                                    <span className="text-muted fs-13">Committed Stock</span>
                                                                    <span className="text-dark fs-13">0.00</span>
                                                                </div>
                                                                <div className="d-flex justify-content-between">
                                                                    <span className="text-muted fs-13">Available for Sale</span>
                                                                    <span className="text-dark fs-13">{activeItem.stockOnHand.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div style={{ flex: isMobile ? "1 1 100%" : undefined }} className={isMobile ? "" : "mt-4 pt-4 border-top"}>
                                                            <div className="p-3 border rounded bg-white shadow-sm">
                                                                <div className="text-muted fs-11 text-uppercase fw-bold mb-2" style={{ letterSpacing: 0.5 }}>Reorder Point</div>
                                                                <div className="fw-bold fs-18 text-dark">{activeItem.reorderLevel.toFixed(2)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ══ LIST / GRID VIEW ══ */
                        <div className="card border-0 rounded-0">
                            <div className="card-header d-flex align-items-center justify-content-between gap-2 flex-wrap">

                                {/* Left: filter title dropdown */}
                                <div ref={filterRef} className="position-relative">
                                    <button className="btn btn-link p-0 text-dark fw-bold fs-17 d-flex align-items-center gap-1 text-decoration-none"
                                        onClick={() => { setFilterOpen(!filterOpen); setViewSearch(""); }}>
                                        {currentViewLabel}
                                        <i className={`ti ${filterOpen ? "ti-chevron-up" : "ti-chevron-down"} fs-13 text-muted`} />
                                    </button>
                                    {filterOpen && (
                                        <div className="card border shadow-lg position-absolute mt-2" style={{ width: 290, zIndex: 300, top: "100%", left: 0 }}>
                                            <div className="p-2 border-bottom">
                                                <div className="input-icon input-icon-start position-relative">
                                                    <span className="input-icon-addon"><i className="ti ti-search text-muted fs-13" /></span>
                                                    <input autoFocus type="text" className="form-control form-control-sm ps-4" value={viewSearch} onChange={e => setViewSearch(e.target.value)} placeholder="" />
                                                </div>
                                            </div>
                                            <div style={{ maxHeight: 300, overflowY: "auto" }}>
                                                {visibleViews.map(view => {
                                                    const isActive = view.key === activeView;
                                                    const isStarred = starred.has(view.key);
                                                    return (
                                                        <div key={view.key}
                                                            className="d-flex align-items-center justify-content-between px-3 py-2"
                                                            style={{ cursor: "pointer", background: isActive ? "#e41f07" : "#fff" }}
                                                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f5f5f5"; }}
                                                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "#fff"; }}
                                                            onClick={() => { setActiveView(view.key); setFilterOpen(false); setViewSearch(""); }}>
                                                            <span className="fs-13" style={{ color: isActive ? "#fff" : "#333", fontWeight: isActive ? 600 : 400 }}>{view.label}</span>
                                                            <span onClick={e => toggleStar(view.key, e)} style={{ fontSize: 14, cursor: "pointer", color: isStarred ? (isActive ? "#fff" : "#f59e0b") : (isActive ? "rgba(255,255,255,0.5)" : "#ccc") }}>
                                                                {isStarred ? "★" : "☆"}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {visibleViews.length === 0 && <div className="text-center text-muted py-3 fs-13">No results</div>}
                                            </div>
                                            <div className="border-top p-2">
                                                <button className="btn btn-link p-0 d-flex align-items-center gap-1 fs-13 text-decoration-none" style={{ color: "#e41f07" }}>
                                                    <i className="ti ti-circle-plus" /> New Custom View
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right toolbar */}
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <div ref={densityRef} className="position-relative">
                                        <div className="d-flex align-items-center shadow border rounded" style={{ overflow: "hidden", cursor: "pointer" }} onClick={() => setDensityOpen(o => !o)}>
                                            <button className="btn btn-sm border-0 px-2 py-1">
                                                <i className={`ti ${rowDensity === "expanded" ? "ti-list" : "ti-list-details"} fs-14 text-muted`} />
                                            </button>
                                            <span className="text-muted" style={{ fontSize: 10, paddingRight: 4 }}>▾</span>
                                        </div>
                                        {densityOpen && (
                                            <div className="card border shadow-lg position-absolute mt-1" style={{ width: 190, zIndex: 500, left: 0, top: "100%", borderRadius: 8, overflow: "hidden", padding: "4px 0" }}>
                                                {[{ key: "expanded", icon: "ti-list", label: "Expanded View" }, { key: "collapsed", icon: "ti-list-details", label: "Collapsed View" }].map(opt => (
                                                    <button key={opt.key}
                                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2"
                                                        style={{ fontSize: 13, background: rowDensity === opt.key ? "#e41f07" : "", color: rowDensity === opt.key ? "#fff" : "", fontWeight: rowDensity === opt.key ? 600 : 400 }}
                                                        onMouseEnter={e => { if (rowDensity !== opt.key) e.currentTarget.style.background = "#fff5f4"; }}
                                                        onMouseLeave={e => { if (rowDensity !== opt.key) e.currentTarget.style.background = ""; }}
                                                        onClick={() => { setRowDensity(opt.key as any); setDensityOpen(false); }}>
                                                        <i className={`ti ${opt.icon} fs-15`} style={{ color: rowDensity === opt.key ? "#fff" : "#6b7280" }} />
                                                        <span>{opt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="d-flex align-items-center shadow p-1 rounded border bg-white view-icons">
                                        <button onClick={() => setViewMode("list")} className={`btn btn-sm p-1 border-0 fs-14 ${viewMode === "list" ? "active" : ""}`} title="List View">
                                            <i className="ti ti-list-tree" />
                                        </button>
                                        <button onClick={() => setViewMode("grid")} className={`btn btn-sm p-1 border-0 fs-14 ms-1 ${viewMode === "grid" ? "active" : ""}`} title="Grid View">
                                            <i className="ti ti-grid-dots" />
                                        </button>
                                    </div>

                                    <button className="btn btn-primary" onClick={() => navigate(route.product)}>
                                        <i className="ti ti-square-rounded-plus-filled me-1" /> + New
                                    </button>

                                    <div ref={moreRef} className="position-relative">
                                        <button className="btn btn-outline-light shadow px-2" onClick={() => { setMoreOpen(!moreOpen); setSortSubmenuOpen(false); }} title="More Actions">
                                            <i className="ti ti-dots fs-16" />
                                        </button>
                                        {moreOpen && (
                                            <div className="card border shadow-lg position-absolute mt-1" style={{ width: 230, zIndex: 300, right: 0, top: "100%", borderRadius: 6, overflow: "hidden", padding: "4px 0" }}>
                                                {/* Sort by */}
                                                <div className="position-relative">
                                                    <button className="dropdown-item d-flex align-items-center justify-content-between px-3 py-2 w-100"
                                                        style={{ fontSize: 13, background: sortSubmenuOpen ? "#fff5f4" : "" }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = "#e41f07"; Array.from(e.currentTarget.querySelectorAll("i,span")).forEach((el: any) => el.style.color = "#fff"); }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = sortSubmenuOpen ? "#fff5f4" : ""; Array.from(e.currentTarget.querySelectorAll("i,span")).forEach((el: any) => el.style.color = ""); }}
                                                        onClick={() => setSortSubmenuOpen(o => !o)}>
                                                        <span className="d-flex align-items-center gap-2"><i className="ti ti-arrows-sort fs-15 text-muted" /><span className="text-dark">Sort by</span></span>
                                                        <i className={`ti ${sortSubmenuOpen ? "ti-chevron-down" : "ti-chevron-right"} fs-12 text-muted`} />
                                                    </button>
                                                    {sortSubmenuOpen && (
                                                        <div className="border-top" style={{ background: "#fafafa" }}>
                                                            {SORT_OPTIONS.map((opt, i) => {
                                                                const isActive = sortField === opt.field && sortDir === opt.dir;
                                                                return (
                                                                    <button key={i}
                                                                        className="dropdown-item d-flex align-items-center justify-content-between px-4 py-2"
                                                                        style={{ fontSize: 12, background: isActive ? "#fff5f4" : "", color: isActive ? "#e41f07" : "#444" }}
                                                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f5f5f5"; }}
                                                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = ""; }}
                                                                        onClick={() => { setSortField(opt.field); setSortDir(opt.dir); setSortSubmenuOpen(false); setMoreOpen(false); }}>
                                                                        <span>{opt.label}</span>
                                                                        {isActive && <i className="ti ti-check fs-12" style={{ color: "#e41f07" }} />}
                                                                    </button>
                                                                );
                                                            })}
                                                            {sortField && (
                                                                <button className="dropdown-item px-4 py-2 text-muted" style={{ fontSize: 11 }}
                                                                    onClick={() => { setSortField(null); setSortSubmenuOpen(false); setMoreOpen(false); }}>
                                                                    <i className="ti ti-x fs-11 me-1" /> Clear Sort
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Import */}
                                                <button className="dropdown-item d-flex align-items-center justify-content-between px-3 py-2"
                                                    style={{ fontSize: 13 }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = "#e41f07"; Array.from(e.currentTarget.querySelectorAll("i,span")).forEach((el: any) => el.style.color = "#fff"); }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = ""; Array.from(e.currentTarget.querySelectorAll("i,span")).forEach((el: any) => el.style.color = ""); }}
                                                    onClick={() => { setImportModalOpen(true); setMoreOpen(false); }}>
                                                    <span className="d-flex align-items-center gap-2"><i className="ti ti-download fs-15 text-muted" /><span className="text-dark">Import</span></span>
                                                    <i className="ti ti-chevron-right fs-12 text-muted" />
                                                </button>
                                                {/* Preferences */}
                                                <button className="dropdown-item d-flex align-items-center px-3 py-2"
                                                    style={{ fontSize: 13 }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = "#e41f07"; Array.from(e.currentTarget.querySelectorAll("i,span")).forEach((el: any) => el.style.color = "#fff"); }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = ""; Array.from(e.currentTarget.querySelectorAll("i,span")).forEach((el: any) => el.style.color = ""); }}
                                                    onClick={() => { navigate(route.productPreference); setMoreOpen(false); }}>
                                                    <span className="d-flex align-items-center gap-2"><i className="ti ti-settings-2 fs-15 text-muted" /><span className="text-dark">Preferences</span></span>
                                                </button>
                                                {/* Refresh List */}
                                                <button className="dropdown-item d-flex align-items-center px-3 py-2"
                                                    style={{ fontSize: 13 }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = "#e41f07"; Array.from(e.currentTarget.querySelectorAll("i,span")).forEach((el: any) => el.style.color = "#fff"); }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = ""; Array.from(e.currentTarget.querySelectorAll("i,span")).forEach((el: any) => el.style.color = ""); }}
                                                    onClick={() => { fetchProducts(); setMoreOpen(false); showToast("List refreshed"); }}>
                                                    <span className="d-flex align-items-center gap-2"><i className="ti ti-refresh fs-15 text-muted" /><span className="text-dark">Refresh List</span></span>
                                                </button>
                                                {/* Reset Column Width */}
                                                <button className="dropdown-item d-flex align-items-center px-3 py-2"
                                                    style={{ fontSize: 13 }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = "#e41f07"; Array.from(e.currentTarget.querySelectorAll("i,span")).forEach((el: any) => el.style.color = "#fff"); }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = ""; Array.from(e.currentTarget.querySelectorAll("i,span")).forEach((el: any) => el.style.color = ""); }}
                                                    onClick={() => { setMoreOpen(false); showToast("Column widths reset"); }}>
                                                    <span className="d-flex align-items-center gap-2"><i className="ti ti-layout-columns fs-15 text-muted" /><span className="text-dark">Reset Column Width</span></span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="card-body">
                                {/* LIST VIEW */}
                                {viewMode === "list" && (
                                    <div className="table-responsive">
                                        <table className="table product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => { setSortField("name"); setSortDir(d => sortField === "name" ? (d === "asc" ? "desc" : "asc") : "asc"); }}>
                                                        <span className="d-flex align-items-center gap-1">
                                                            NAME <i className={`ti ${sortField === "name" ? (sortDir === "asc" ? "ti-sort-ascending" : "ti-sort-descending") : "ti-arrows-sort"} fs-11`} style={{ color: sortField === "name" ? "#e41f07" : undefined }} />
                                                        </span>
                                                    </th>
                                                    <th>
                                                        <span>SKU</span>
                                                    </th>
                                                    <th className="text-end" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => { setSortField("stock"); setSortDir(d => sortField === "stock" ? (d === "asc" ? "desc" : "asc") : "asc"); }}>
                                                        <span className="d-flex align-items-center justify-content-end gap-1">
                                                            STOCK ON HAND <i className={`ti ${sortField === "stock" ? (sortDir === "asc" ? "ti-sort-ascending" : "ti-sort-descending") : "ti-arrows-sort"} fs-11`} style={{ color: sortField === "stock" ? "#e41f07" : undefined }} />
                                                        </span>
                                                    </th>
                                                    <th className="text-end" style={{ cursor: "pointer", userSelect: "none" }} onClick={() => { setSortField("reorder"); setSortDir(d => sortField === "reorder" ? (d === "asc" ? "desc" : "asc") : "asc"); }}>
                                                        <span className="d-flex align-items-center justify-content-end gap-1">
                                                            REORDER LEVEL <i className={`ti ${sortField === "reorder" ? (sortDir === "asc" ? "ti-sort-ascending" : "ti-sort-descending") : "ti-arrows-sort"} fs-11`} style={{ color: sortField === "reorder" ? "#e41f07" : undefined }} />
                                                        </span>
                                                    </th>

                                                    {/* ══ SEARCH ICON COLUMN — click opens modal ══ */}
                                                    <th style={{ width: 28, textAlign: "right", padding: "10px 16px 10px 6px" }}>
                                                        <i
                                                            className="ti ti-search fs-13"
                                                            title="Search Items"
                                                            onClick={() => setSearchOpen(true)}
                                                            style={{
                                                                cursor: "pointer",
                                                                color: isSearchActive ? "#e41f07" : "#6c757d",
                                                                transition: "color 0.15s",
                                                            }}
                                                            onMouseEnter={e => (e.currentTarget.style.color = "#e41f07")}
                                                            onMouseLeave={e => (e.currentTarget.style.color = isSearchActive ? "#e41f07" : "#6c757d")}
                                                        />
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredItems.length === 0 && (
                                                    <tr><td colSpan={5} className="text-center text-muted py-5 fs-13">
                                                        No items found
                                                        {isSearchActive && (
                                                            <span> — <span className="text-danger" style={{ cursor: "pointer" }} onClick={() => setAppliedSearch(null)}>Clear search</span></span>
                                                        )}
                                                    </td></tr>
                                                )}
                                                {filteredItems.map(item => (
                                                    <tr key={item.id} onClick={() => openDetail(item.id)}
                                                        style={{ cursor: "pointer", ...(rowDensity === "collapsed" ? { lineHeight: "1.2" } : {}) }}>
                                                        <td style={rowDensity === "collapsed" ? { padding: "6px 12px" } : {}}>
                                                            <div className="d-flex align-items-center gap-2">
                                                                {rowDensity === "expanded" && (
                                                                    <div style={{ width: 36, height: 36, borderRadius: 4, background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e5e7eb", flexShrink: 0 }}>
                                                                        {item.image ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <i className="ti ti-photo text-muted fs-14" />}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <span className="title-name" style={{ color: "#333", fontWeight: 500, fontSize: rowDensity === "collapsed" ? 12 : 13 }}>{item.name}</span>
                                                                    {rowDensity === "expanded" && item.sku && <div style={{ fontSize: 11, color: "#aaa" }}>{item.sku}</div>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-muted" style={rowDensity === "collapsed" ? { padding: "6px 12px", fontSize: 12 } : { fontSize: 13 }}>{item.sku}</td>
                                                        <td className="text-end" style={rowDensity === "collapsed" ? { padding: "6px 12px", fontSize: 12 } : { fontSize: 13 }}>{item.stockOnHand.toFixed(2)}</td>
                                                        <td className="text-end" style={rowDensity === "collapsed" ? { padding: "6px 12px", fontSize: 12 } : { fontSize: 13 }}>{item.reorderLevel.toFixed(2)}</td>
                                                        <td style={{ width: 28, padding: rowDensity === "collapsed" ? "6px 16px 6px 6px" : "10px 16px 10px 6px" }}>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Active search filter badge */}
                                        {isSearchActive && (
                                            <div className="d-flex align-items-center gap-2 px-2 py-2 border-top" style={{ background: "#fff8f7" }}>
                                                <i className="ti ti-filter fs-13 text-danger" />
                                                <span className="fs-12 text-muted">Search filter is active</span>
                                                <button
                                                    className="btn btn-sm ms-1"
                                                    style={{ background: "#fff0ee", color: "#e41f07", border: "1px solid #fecaca", fontSize: 11, padding: "1px 10px", borderRadius: 20 }}
                                                    onClick={() => setAppliedSearch(null)}>
                                                    Clear ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* GRID VIEW */}
                                {viewMode === "grid" && (
                                    <div className="row g-3 mt-1">
                                        {filteredItems.map(item => (
                                            <div key={item.id} className="col-xxl-3 col-xl-4 col-lg-4 col-md-6 col-sm-6">
                                                <div className="card border-0 shadow-sm p-3 mb-2" onClick={() => openDetail(item.id)} style={{ cursor: "pointer", borderRadius: 8 }}>
                                                    {/* Header: ID/SKU and More Actions */}
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <span className="badge bg-light text-primary border px-2 py-1" style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>#{item.sku || `PROD-${item.id}`}</span>
                                                        <div className="dropdown" onClick={e => e.stopPropagation()}>
                                                            <button className="btn btn-link p-0 text-muted text-decoration-none" data-bs-toggle="dropdown" aria-expanded="false">
                                                                <i className="ti ti-dots-vertical fs-14"></i>
                                                            </button>
                                                            <ul className="dropdown-menu dropdown-menu-end shadow-sm border py-2" style={{ minWidth: 140 }}>
                                                                <li><a className="dropdown-item py-2 fs-13" href="#" onClick={(e) => handleEditProduct(e, item.id)}><i className="ti ti-edit text-primary me-2" /> Edit</a></li>
                                                                <li><a className="dropdown-item py-2 fs-13" href="#" onClick={(e) => handleDeleteProduct(e, item.id)}><i className="ti ti-trash text-danger me-2" /> <span className="text-danger">Delete</span></a></li>
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    {/* Title and Status Badge */}
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div className="flex-grow-1 text-truncate pe-2">
                                                            <h6 className="fw-bold mb-1 text-dark fs-15 text-truncate">{item.name}</h6>
                                                            <div className="text-muted fs-13 text-truncate">Category : {item.category}</div>
                                                        </div>
                                                        <span className="badge" style={{ backgroundColor: item.status === "active" ? "#dcfce7" : "#fef3c7", color: item.status === "active" ? "#16a34a" : "#d97706", fontSize: 11, padding: "5px 10px", borderRadius: 4 }}>
                                                            {item.status === 'active' ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>

                                                    {/* Details List */}
                                                    <div className="d-flex flex-column gap-2 mb-4">
                                                        <div className="d-flex align-items-center text-muted fs-13">
                                                            <i className="ti ti-box me-2 text-dark fs-15"></i> Stock on Hand : <strong className="ms-1 text-dark">{item.stockOnHand.toFixed(2)}</strong>
                                                        </div>
                                                        <div className="d-flex align-items-center text-muted fs-13">
                                                            <i className="ti ti-alert-triangle me-2 text-dark fs-15"></i> Reorder Level : <strong className="ms-1 text-dark">{item.reorderLevel.toFixed(2)}</strong>
                                                        </div>
                                                        <div className="d-flex align-items-center text-muted fs-13">
                                                            <i className="ti ti-tag me-2 text-dark fs-15"></i> Brand : <strong className="ms-1 text-dark text-truncate" style={{ maxWidth: 100 }}>{item.brand}</strong>
                                                        </div>
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="d-flex align-items-center pt-3 border-top gap-2">
                                                        <div className="bg-light rounded-circle shadow-sm border d-flex justify-content-center align-items-center flex-shrink-0" style={{ width: 32, height: 32, overflow: "hidden" }}>
                                                            {itemImages[item.id] || item.image ? (
                                                                <img src={itemImages[item.id] || item.image} alt="pic" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                            ) : (
                                                                <i className="ti ti-photo fs-14 text-muted"></i>
                                                            )}
                                                        </div>
                                                        <div className="fs-13 text-muted text-truncate">
                                                            Cost : <span className="fw-medium text-dark">₹{item.costPrice?.toFixed(2) || '0.00'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div >
            <Footer />
        </>
    );
};

export default ProductList;
