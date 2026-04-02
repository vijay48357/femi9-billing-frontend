import { useState, useEffect } from 'react';
import "../../billing-application.scss";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import Select, { components } from "react-select";
import CreatableSelect from "react-select/creatable";
import Footer from "../../../../../components/footer/footer";
import PageHeader from "../../../../../components/page-header/pageHeader";
import SettingsTopbar from "../../../settings/settings-topbar/settingsTopbar";
import { all_routes } from "../../../../../routes/all_routes";
import { productService } from "../../../../../api/productService";

// ── Image compression (max 5 MB, PNG / JPG / WebP only) ──────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const compressImage = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            reject(new Error('Only PNG, JPG, and WebP images are allowed.'));
            return;
        }
        if (file.size <= MAX_IMAGE_BYTES) { resolve(file); return; }

        const img = new window.Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const MAX_DIM = 2560;
            if (width > MAX_DIM || height > MAX_DIM) {
                const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
            const outType = file.type === 'image/png' ? 'image/png'
                : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
            let quality = 0.9;
            const tryCompress = () => {
                canvas.toBlob((blob) => {
                    if (!blob) { resolve(file); return; }
                    if (blob.size <= MAX_IMAGE_BYTES || quality <= 0.1) {
                        resolve(new File([blob], file.name, { type: outType, lastModified: Date.now() }));
                    } else { quality = Math.round((quality - 0.1) * 10) / 10; tryCompress(); }
                }, outType, quality);
            };
            tryCompress();
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
        img.src = objectUrl;
    });

const handleImageSelect = async (
    file: File,
    onSuccess: (f: File) => void,
) => {
    try {
        const compressed = await compressImage(file);
        onSuccess(compressed);
    } catch (err: any) {
        alert(err.message || 'Invalid image format.');
    }
};

const customStyles = {
    control: (base: any, state: any) => ({
        ...base,
        borderColor: state.isFocused || state.menuIsOpen ? '#e41f07' : '#e3e3e3',
        boxShadow: 'none',
        '&:hover': { borderColor: state.isFocused || state.menuIsOpen ? '#e41f07' : '#e3e3e3' },
        borderRadius: '0.375rem', minHeight: '38px', cursor: 'pointer', backgroundColor: 'white',
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? '#e41f07' : (state.isFocused ? '#fff' : 'white'),
        color: state.isSelected ? '#fff' : (state.isFocused ? '#e41f07' : '#707070'),
        fontWeight: state.isSelected ? '600' : '400', cursor: 'pointer',
        '&:hover': { backgroundColor: '#e41f07', color: '#fff' },
    }),
    groupHeading: (base: any) => ({ ...base, textTransform: 'none', fontSize: '11px', color: '#999', fontWeight: '600', padding: '10px 12px 5px' }),
    singleValue: (base: any) => ({ ...base, color: '#333' }),
    placeholder: (base: any) => ({ ...base, color: '#9e9e9e', fontWeight: '400' }),
};

const SearchOption = (props: any) => (
    <components.Option {...props}>
        <div className="d-flex align-items-center justify-content-between">
            <span>{props.label}</span>
            {props.isSelected && <i className="ti ti-check text-primary fs-14" />}
        </div>
    </components.Option>
);

const DropdownIndicator = (props: any) => (
    <components.DropdownIndicator {...props}>
        <i className={`ti ${props.selectProps.menuIsOpen ? 'ti-chevron-up' : 'ti-chevron-down'} fs-14 text-muted`} />
    </components.DropdownIndicator>
);

const SearchControl = (props: any) => {
    const { selectProps } = props;
    return (
        <div onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.closest('.react-select__input');
            if (selectProps.menuIsOpen && isInput) return;
            e.preventDefault(); e.stopPropagation();
            if (selectProps.menuIsOpen) selectProps.onMenuClose(); else selectProps.onMenuOpen();
        }}>
            <components.Control {...props} />
        </div>
    );
};

const neutralTheme = (theme: any) => ({
    ...theme,
    colors: { ...theme.colors, primary: '#aaaaaa', primary25: '#f8f9fa', primary50: '#e8e8e8', primary75: '#d1d1d1' },
});

const SearchMenuList = (props: any) => {
    const { selectProps } = props;
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    return (
        <components.MenuList {...props}>
            <div className="p-2 border-bottom sticky-top bg-white" style={{ zIndex: 2, top: 0 }}>
                <div className="input-group input-group-sm border rounded"
                    onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
                    style={{ borderColor: isFocused ? '#e41f07' : '#e3e3e3', boxShadow: 'none', backgroundColor: isHovered && !isFocused ? '#fcfdfe' : 'white', transition: 'all 0.2s ease' }}>
                    <span className="input-group-text bg-transparent border-0 pe-1">
                        <i className="ti ti-search" style={{ color: isFocused ? '#e41f07' : '#999' }} />
                    </span>
                    <input type="text" className="form-control border-0 shadow-none ps-0 bg-transparent" placeholder="Search" autoFocus
                        value={selectProps.inputValue || ""} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                        onChange={(e) => selectProps.onInputChange(e.currentTarget.value, { action: 'input-change' })}
                        onKeyDown={(e) => e.stopPropagation()} />
                </div>
            </div>
            {props.children}
            {selectProps.menuFooter}
        </components.MenuList>
    );
};

const UnitOption = (props: any) => {
    const { data } = props;
    return (
        <components.Option {...props}>
            <div className="d-flex align-items-center justify-content-between w-100">
                <span className="text-muted">
                    <span className="text-uppercase">{data.label.split(' - ')[0]}</span>
                    {data.label.includes(' - ') && <span className="mx-1">-</span>}
                    <span className="small">{data.label.split(' - ')[1] || data.value}</span>
                </span>
                {props.isSelected && <i className="ti ti-check text-danger fs-14" />}
            </div>
        </components.Option>
    );
};

const HelpIcon = ({ text, id }: { text: string; id: string }) => (
    <OverlayTrigger placement="top" delay={{ show: 200, hide: 200 }} overlay={<Tooltip id={id} className="custom-tooltip">{text}</Tooltip>}>
        <span className="ms-1 d-inline-flex align-items-center" style={{ cursor: 'help' }}>
            <i className="ti ti-help-circle text-muted" style={{ fontSize: '13px' }} />
        </span>
    </OverlayTrigger>
);

const unitSelectStyles = {
    control: (base: any) => ({
        ...base, minHeight: '31px', height: '31px', border: '1px solid #e3e3e3', borderLeft: 'none',
        borderRadius: '0 5px 5px 0', backgroundColor: '#f8f9fa', fontSize: '12px', cursor: 'pointer', boxShadow: 'none',
        '&:hover': { backgroundColor: '#f1f3f5' }
    }),
    valueContainer: (base: any) => ({ ...base, padding: '0 8px', height: '31px' }),
    indicatorsContainer: (base: any) => ({ ...base, height: '31px' }),
    dropdownIndicator: (base: any) => ({ ...base, padding: '2px' }),
    menu: (base: any) => ({ ...base, width: '60px', right: 0, left: 'auto', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e3e3e3' }),
    option: (base: any, state: any) => ({
        ...base, padding: '4px 10px',
        backgroundColor: state.isSelected ? '#e41f07' : (state.isFocused ? '#fff' : 'white'),
        color: state.isSelected ? 'white' : (state.isFocused ? '#e41f07' : '#333'),
        cursor: 'pointer', '&:hover': { backgroundColor: '#e41f07', color: '#fff' },
    })
};

type AttributeOption = { value: string; label: string };
type Attribute = { id: number; name: string; options: AttributeOption[] };

const Product = () => {
    const [categories, setCategories] = useState<{ id: number; name: string; isDeleted?: boolean }[]>([]);
    const [brands, setBrands] = useState<{ id: number; name: string; isDeleted?: boolean }[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal States
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [showNewBrand, setShowNewBrand] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [editingBrandId, setEditingBrandId] = useState<number | null>(null);

    const fetchInitialData = async () => {
        try {
            const [bResp, cResp] = await Promise.all([
                productService.getBrands(),
                productService.getCategories(),
            ]);
            if (bResp.data.success) setBrands(bResp.data.data);
            if (cResp.data.success) setCategories(cResp.data.data);
            return {
                brands: bResp.data.success ? bResp.data.data : [],
                categories: cResp.data.success ? cResp.data.data : [],
            };
        } catch (err) {
            console.error("Failed to fetch initial data", err);
            return { brands: [], categories: [] };
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const categoryOptions = categories.map(c => ({ value: c.id.toString(), label: c.name }));
    const brandOptions = brands.map(b => ({ value: b.id.toString(), label: b.name }));

    const [itemType, setItemType] = useState('Goods');
    const [detailType, setDetailType] = useState('Single Item');
    const [itemName, setItemName] = useState('');
    const [skuFormat, setSkuFormat] = useState<{ id: number, label: string, showType: string, length: number, letterCase: string, separator: string, customValue?: string }[]>([
        { id: 1, label: 'Item Name', showType: 'First', length: 3, letterCase: 'Upper Case', separator: '-' },
        { id: 2, label: '', showType: 'First', length: 3, letterCase: 'Upper Case', separator: 'None' }
    ]);
    const [attributes, setAttributes] = useState<Attribute[]>([{ id: Date.now(), name: '', options: [] }]);
    const [attrInputValues, setAttrInputValues] = useState<Record<number, string>>({});
    const [variants, setVariants] = useState<{
        id: string; name: string; sku: string; costPrice: string; sellingPrice: string;
        upc?: string; mpn?: string; ean?: string; isbn?: string; image?: File | null; image_url?: string;
    }[]>([]);
    const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
    const [variantAdditionalInfo, setVariantAdditionalInfo] = useState({ upc: '', mpn: '', ean: '', isbn: '' });
    const [trackInventory, setTrackInventory] = useState(true);
    const [isReturnable, setIsReturnable] = useState('Yes');
    const [showIdentifiers, setShowIdentifiers] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<any>(null);
    const [dimensionUnit, setDimensionUnit] = useState({ value: 'cm', label: 'cm' });
    const [weightUnit, setWeightUnit] = useState({ value: 'kg', label: 'kg' });
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [categorySearch, setCategorySearch] = useState('');
    const [selectedBrand, setSelectedBrand] = useState<any>(null);
    const [brandSearch, setBrandSearch] = useState('');
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    const [vendorSearch, setVendorSearch] = useState('');
    const [selectedInventoryAccount, setSelectedInventoryAccount] = useState<any>(null);
    const [invAccountSearch, setInvAccountSearch] = useState('');
    const [selectedValuation, setSelectedValuation] = useState<any>(null);
    const [valuationSearch, setValuationSearch] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [images, setImages] = useState<File[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Form Field States
    const [sku, setSku] = useState('');
    const [description, setDescription] = useState('');
    const [salesPrice, setSalesPrice] = useState('');
    const [salesDescription, setSalesDescription] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [purchaseDescription, setPurchaseDescription] = useState('');
    const [reorderPoint, setReorderPoint] = useState('');
    const [dimensionL, setDimensionL] = useState('');
    const [dimensionW, setDimensionW] = useState('');
    const [dimensionH, setDimensionH] = useState('');
    const [weight, setWeight] = useState('');

    useEffect(() => {
        const h = (event: MouseEvent) => {
            const t = event.target as Element;
            if (t.closest('.custom-react-select') || t.closest('.modal')) return;
            if (openMenuId) setOpenMenuId(null);
        };
        if (openMenuId) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [openMenuId]);

    const [units, setUnits] = useState([
        { value: 'box', label: 'BOX - box' }, { value: 'cm', label: 'CMS - cm' }, { value: 'dz', label: 'DOZ - dz' },
        { value: 'ft', label: 'FTS - ft' }, { value: 'g', label: 'GMS - g' }, { value: 'in', label: 'INC - in' },
        { value: 'kg', label: 'KGS - kg' }, { value: 'km', label: 'KME - km' }, { value: 'lb', label: 'LBS - lb' },
        { value: 'mg', label: 'MGS - mg' }, { value: 'ml', label: 'MLT - ml' }, { value: 'm', label: 'MTR - m' },
        { value: 'pcs', label: 'PCS - pcs' },
    ]);

    // ── Category Handlers ──
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            let resp;
            if (editingCategoryId) {
                resp = await (productService as any).updateCategory(editingCategoryId, { name: newCategoryName.trim() });
            } else {
                resp = await (productService as any).createCategory({ name: newCategoryName.trim() });
            }
            if (resp.data.success) {
                await fetchInitialData();
                setShowNewCategory(false);
                setNewCategoryName('');
                setEditingCategoryId(null);
                // Auto-select the newly added category
                const added = resp.data.data;
                if (added) setSelectedCategory({ value: added.id.toString(), label: added.name });
            }
        } catch (err: any) {
            console.error("Category action failed", err);
            const msg = (err.response?.data?.message || err.message || "").toLowerCase();
            if (msg.includes("already exists")) {
                alert("This category already exists. I will search for it and select it for you.");
                await fetchInitialData();
                // We need to wait for state to update or use the fresh data directly
                // fetchInitialData updates state, but for immediate finding we might need more.
                // However, setCategories is async. Let's just tell them to select it.
                // Actually, let's try to find it in the current state just in case it's already there
                const existing = categories.find(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase());
                if (existing) {
                    setSelectedCategory({ value: existing.id.toString(), label: existing.name });
                    setShowNewCategory(false);
                    setNewCategoryName('');
                } else {
                    alert("Found it! Please select it from the dropdown.");
                }
            } else {
                alert("Category action failed: " + (err.response?.data?.message || err.message));
            }
        }
    };
    const handleEditCategoryClick = (id: number, name: string) => {
        setEditingCategoryId(id);
        setNewCategoryName(name);
        setShowNewCategory(true);
    };
    const handleSoftDeleteCategory = async (id: number) => {
        if (!window.confirm("Delete this category?")) return;
        try {
            const resp = await (productService as any).deleteCategory(id);
            if (resp.data.success) {
                setCategories(categories.map(c => c.id === id ? { ...c, isDeleted: true } : c));
            }
        } catch (err) { console.error("Category delete failed", err); }
    };

    const handleCreateCategoryDirectly = async (inputValue: string) => {
        if (!inputValue.trim()) return;
        setLoading(true);
        try {
            const resp = await (productService as any).createCategory({ name: inputValue.trim() });
            if (resp.data.success) {
                await fetchInitialData();
                const refreshed = await productService.getCategories();
                if (refreshed.data.success) {
                    setCategories(refreshed.data.data);
                    const newCat = refreshed.data.data.find((c: any) => c.name === inputValue.trim());
                    if (newCat) setSelectedCategory({ value: newCat.id.toString(), label: newCat.name });
                }
            }
        } catch (err: any) {
            const msg = (err.response?.data?.message || err.message || "").toLowerCase();
            if (msg.includes("already exists")) {
                await fetchInitialData();
                const existing = categories.find(c => c.name.toLowerCase() === inputValue.trim().toLowerCase());
                if (existing) setSelectedCategory({ value: existing.id.toString(), label: existing.name });
            } else {
                alert("Category creation failed: " + (err.response?.data?.message || err.message));
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Brand Handlers ──
    const handleAddBrand = async () => {
        if (!newBrandName.trim()) return;
        try {
            let resp;
            if (editingBrandId) {
                resp = await (productService as any).updateBrand(editingBrandId, { name: newBrandName.trim() });
            } else {
                resp = await (productService as any).createBrand({ name: newBrandName.trim() });
            }
            if (resp.data.success) {
                await fetchInitialData();
                setShowNewBrand(false);
                setNewBrandName('');
                setEditingBrandId(null);
                // Auto-select the newly added brand
                const added = resp.data.data;
                if (added) setSelectedBrand({ value: added.id.toString(), label: added.name });
            }
        } catch (err: any) {
            console.error("Brand action failed", err);
            const msg = (err.response?.data?.message || err.message || "").toLowerCase();
            if (msg.includes("already exists")) {
                alert("This brand already exists. I will search for it and select it for you.");
                await fetchInitialData();
                const existing = brands.find(b => b.name.toLowerCase() === newBrandName.trim().toLowerCase());
                if (existing) {
                    setSelectedBrand({ value: existing.id.toString(), label: existing.name });
                    setShowNewBrand(false);
                    setNewBrandName('');
                }
            } else {
                alert("Brand action failed: " + (err.response?.data?.message || err.message));
            }
        }
    };
    const handleEditBrandClick = (id: number, name: string) => {
        setEditingBrandId(id);
        setNewBrandName(name);
        setShowNewBrand(true);
    };
    const handleSoftDeleteBrand = async (id: number) => {
        if (!window.confirm("Delete this brand?")) return;
        try {
            const resp = await (productService as any).deleteBrand(id);
            if (resp.data.success) {
                setBrands(brands.map(b => b.id === id ? { ...b, isDeleted: true } : b));
            }
        } catch (err) { console.error("Brand delete failed", err); }
    };

    const handleCreateBrandDirectly = async (inputValue: string) => {
        if (!inputValue.trim()) return;
        setLoading(true);
        try {
            const resp = await (productService as any).createBrand({ name: inputValue.trim() });
            if (resp.data.success) {
                await fetchInitialData();
                const refreshed = await productService.getBrands();
                if (refreshed.data.success) {
                    setBrands(refreshed.data.data);
                    const newBrand = refreshed.data.data.find((b: any) => b.name === inputValue.trim());
                    if (newBrand) setSelectedBrand({ value: newBrand.id.toString(), label: newBrand.name });
                }
            }
        } catch (err: any) {
            const msg = (err.response?.data?.message || err.message || "").toLowerCase();
            if (msg.includes("already exists")) {
                await fetchInitialData();
                const existing = brands.find(b => b.name.toLowerCase() === inputValue.trim().toLowerCase());
                if (existing) setSelectedBrand({ value: existing.id.toString(), label: existing.name });
            } else {
                alert("Brand creation failed: " + (err.response?.data?.message || err.message));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenIdentifiersModal = (variant: any) => {
        setEditingVariantId(variant.id);
        setVariantAdditionalInfo({ upc: variant.upc || '', mpn: variant.mpn || '', ean: variant.ean || '', isbn: variant.isbn || '' });
        const el = document.getElementById('identifiers-modal');
        if (el) new (window as any).bootstrap.Modal(el).show();
    };
    const handleSaveIdentifiers = () => {
        setVariants(variants.map(v => v.id === editingVariantId ? { ...v, ...variantAdditionalInfo } : v));
        const el = document.getElementById('identifiers-modal');
        if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
    };

    const updateVariants = (updatedAttrs: Attribute[]) => {
        const valid = updatedAttrs.filter(a => a.name && a.options.length > 0);
        if (valid.length === 0) { setVariants([]); return; }
        const cartesian = (...args: any[][]) => args.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
        const combos = valid.length === 1 ? valid[0].options.map(o => [o.label]) : cartesian(...valid.map(a => a.options.map(o => o.label)));
        setVariants(combos.map((combo: string[]) => {
            const name = combo.join(' - ');
            const ex = variants.find(v => v.name === name);
            return { id: Math.random().toString(36).substr(2, 9), name, sku: ex?.sku || '', costPrice: ex?.costPrice || '', sellingPrice: ex?.sellingPrice || '0', image: ex?.image || null };
        }));
    };

    const handleAddAttribute = () => { if (attributes.length < 3) setAttributes([...attributes, { id: Date.now(), name: '', options: [] }]); };
    const handleRemoveAttribute = (id: number) => { const f = attributes.filter(a => a.id !== id); setAttributes(f); updateVariants(f); };
    const handleAttributeChange = (id: number, field: string, value: any) => {
        const updated = attributes.map(a => a.id !== id ? a : { ...a, [field]: value });
        setAttributes(updated); updateVariants(updated);
    };
    const handleVariantImageChange = (vIndex: number, file: File | null) => {
        const updated = [...variants];
        if (file === null) {
            updated[vIndex] = { ...updated[vIndex], image: null, image_url: undefined };
        } else {
            updated[vIndex] = { ...updated[vIndex], image: file };
        }
        setVariants(updated);
    };
    const handleCopyAll = (field: 'costPrice' | 'sellingPrice', value: string) => setVariants(variants.map(v => ({ ...v, [field]: value })));
    const handleAddSkuFormat = () => setSkuFormat([...skuFormat, { id: Date.now(), label: '', showType: 'First', length: 3, letterCase: 'Upper Case', separator: 'None' }]);
    const handleRemoveSkuFormat = (id: number) => setSkuFormat(skuFormat.filter(f => f.id !== id));
    const updateSkuFormat = (id: number, field: string, value: any) => setSkuFormat(skuFormat.map(f => f.id === id ? { ...f, [field]: value } : f));

    const computeSku = (nameVal: string, varOps: string[], attrs: Attribute[], fmtList: typeof skuFormat) => {
        let s = '';
        fmtList.forEach((fmt, i) => {
            if (!fmt.label) return;
            let base = fmt.label === 'Item Name' ? (nameVal || 'ITEM') : fmt.label === 'Custom Text' ? (fmt.customValue || '') : (() => { const idx = attrs.findIndex(a => a.name === fmt.label); return (idx !== -1 && varOps[idx]) ? varOps[idx] : 'ATTR'; })();
            if (!base) return;
            let v = base;
            if (fmt.label !== 'Custom Text') { if (fmt.showType === 'First') v = base.substring(0, fmt.length); else if (fmt.showType === 'Last') v = base.substring(Math.max(0, base.length - fmt.length)); }
            if (fmt.letterCase === 'Upper Case') v = v.toUpperCase(); else if (fmt.letterCase === 'Lower Case') v = v.toLowerCase();
            s += v + ((fmt.separator !== 'None' && i !== fmtList.length - 1) ? fmt.separator : '');
        });
        return s;
    };

    const previewSku = () => {
        const va = attributes.filter(a => a.name && a.options.length > 0);
        const ops = variants.length > 0 ? variants[0].name.split(' - ') : (va.length > 0 ? va.map(a => a.options[0]?.label || 'OPT') : ['Option1']);
        return computeSku(itemName, ops, va, skuFormat) || 'Preview';
    };
    const handleGenerateSkuIds = () => {
        const va = attributes.filter(a => a.name && a.options.length > 0);
        setVariants(variants.map(v => ({ ...v, sku: computeSku(itemName, v.name.split(' - '), va, skuFormat) })));
    };

    const vendors = [{ value: 'Vendor A', label: 'Vendor A' }, { value: 'Vendor B', label: 'Vendor B' }];
    const dimensionUnits = [{ value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }, { value: 'mm', label: 'mm' }, { value: 'm', label: 'm' }];
    const weightUnits = [{ value: 'kg', label: 'kg' }, { value: 'g', label: 'g' }, { value: 'lb', label: 'lb' }, { value: 'oz', label: 'oz' }];
    const valuationMethods = [{ value: 'FIFO', label: 'FIFO (First In, First Out)' }, { value: 'WAC', label: 'WAC (Weighted Average Costing)' }];
    const inventoryAccountOptions = [{ label: 'Stock', options: [{ value: 'inv_asset', label: 'Inventory Asset' }] }];
    const searchableSelectProps: any = {
        styles: customStyles, theme: neutralTheme, isSearchable: true,
        components: { MenuList: SearchMenuList, Option: SearchOption, DropdownIndicator, Control: SearchControl, Input: () => null, IndicatorSeparator: () => null },
        blurInputOnSelect: true, closeMenuOnSelect: true,
    };

    // Row height for variant table cells to stay equal
    const variantRowH = '40px';

    const navigate = useNavigate();
    const { id } = useParams();

    // ── Load product data if editing ───────────────────────────────────
    useEffect(() => {
        if (!id) return;

        setLoading(true);

        // Load brands, categories AND product data together so dropdowns are ready
        Promise.all([
            productService.getProduct(id),
            productService.getBrands(),
            productService.getCategories(),
        ])
            .then(([pResp, bResp, cResp]) => {
                // Set brands & categories first
                const freshBrands = bResp.data.success ? bResp.data.data : [];
                const freshCategories = cResp.data.success ? cResp.data.data : [];
                setBrands(freshBrands);
                setCategories(freshCategories);

                if (!pResp.data.success) return;

                // Handle all common API response structures
                const raw = pResp.data;
                const p = raw.data?.data ?? raw.data ?? raw ?? {};

                if (!p || !p.id) return;

                // ── Basic fields ──
                setItemName(p.name || '');
                setItemType(p.type === 'service' ? 'Service' : 'Goods');
                setDetailType(p.item_variant_type === 'contains_variants' ? 'Contains Variants' : 'Single Item');
                setIsReturnable(p.is_returnable ? 'Yes' : 'No');
                setSku(p.sku || '');
                setDescription(p.description || '');

                // ── Pricing ──
                setSalesPrice(p.selling_price?.toString() || '');
                setSalesDescription(p.sales_description || '');
                setPurchasePrice(p.cost_price?.toString() || '');
                setPurchaseDescription(p.purchase_description || '');

                // ── Inventory ──
                setTrackInventory(p.track_inventory === undefined ? true : !!p.track_inventory);
                setReorderPoint(p.reorder_point?.toString() || '');

                // ── Dimensions & Weight ──
                setDimensionL(p.dimension_l?.toString() || '');
                setDimensionW(p.dimension_w?.toString() || '');
                setDimensionH(p.dimension_h?.toString() || '');
                if (p.dimension_unit) setDimensionUnit({ value: p.dimension_unit, label: p.dimension_unit });
                setWeight(p.weight?.toString() || '');
                if (p.weight_unit) setWeightUnit({ value: p.weight_unit, label: p.weight_unit });

                // ── Image ──
                if (p.front_image_url) setPreviewUrl(p.front_image_url);

                // ── Unit ──
                if (p.unit) {
                    const matchedUnit = units.find(u => u.value === p.unit);
                    setSelectedUnit(matchedUnit || { value: p.unit, label: `${p.unit.toUpperCase()} - ${p.unit}` });
                }

                // ── Brand (use fresh data for matching) ──
                if (p.brand_id || p.brand_name || p.brand) {
                    const matched = freshBrands.find((b: any) => b.id?.toString() === p.brand_id?.toString());
                    setSelectedBrand({ value: p.brand_id?.toString() || '', label: matched?.name || p.brand_name || p.brand || 'Selected Brand' });
                }

                // ── Category (use fresh data for matching) ──
                if (p.category_id || p.category_name || p.category) {
                    const matched = freshCategories.find((c: any) => c.id?.toString() === p.category_id?.toString());
                    setSelectedCategory({ value: p.category_id?.toString() || '', label: matched?.name || p.category_name || p.category || 'Selected Category' });
                }

                // ── Identifiers ──
                if (p.upc || p.mpn || p.ean || p.isbn) {
                    setShowIdentifiers(true);
                    setVariantAdditionalInfo({ upc: p.upc || '', mpn: p.mpn || '', ean: p.ean || '', isbn: p.isbn || '' });
                }

                // ── Preferred Vendor ──
                if (p.preferred_vendor || p.vendor_name || p.vendor_id) {
                    setSelectedVendor({ value: p.vendor_id?.toString() || p.preferred_vendor || '', label: p.vendor_name || p.preferred_vendor || 'Selected Vendor' });
                }

                // ── Inventory Account ──
                if (p.inventory_account) {
                    setSelectedInventoryAccount({ value: p.inventory_account, label: p.inventory_account === 'inv_asset' ? 'Inventory Asset' : p.inventory_account });
                }

                // ── Inventory Valuation ──
                const vm = p.valuation_method || p.inventory_valuation_method;
                if (vm) {
                    const vLabels: Record<string, string> = { FIFO: 'FIFO (First In, First Out)', WAC: 'WAC (Weighted Average Costing)' };
                    setSelectedValuation({ value: vm, label: vLabels[vm] || vm });
                }

                // ── Variants ──
                const variantsArr = p.variants ?? p.variants_data?.variants ?? [];
                if (variantsArr.length > 0) {
                    setVariants(variantsArr.map((v: any) => ({
                        id: v.id?.toString() || Math.random().toString(36).substr(2, 9),
                        name: v.name || '',
                        sku: v.sku || '',
                        costPrice: v.cost_price?.toString() || '',
                        sellingPrice: v.selling_price?.toString() || '',
                        upc: v.upc || '',
                        mpn: v.mpn || '',
                        ean: v.ean || '',
                        isbn: v.isbn || '',
                        image_url: v.image_url || '',
                    })));
                }
            })
            .catch(err => {
                console.error("Edit load failed:", err.response?.data || err.message);
            })
            .finally(() => setLoading(false));
    }, [id]); 
    // ── Save product via API ────────────────
    const handleSave = async () => {
        if (!itemName.trim()) {
            alert('Please enter a product name.');
            return;
        }

        const formData = new FormData();
        formData.append('name', itemName.trim());
        formData.append('type', itemType.toLowerCase());
        formData.append('item_variant_type', detailType === 'Single Item' ? 'single' : 'contains_variants');
        formData.append('unit', selectedUnit?.value || 'pcs');
        formData.append('is_returnable', isReturnable === 'Yes' ? '1' : '0');
        if (sku) formData.append('sku', sku);
        if (description) formData.append('description', description);
        if (salesPrice) formData.append('selling_price', salesPrice);
        if (salesDescription) formData.append('sales_description', salesDescription);
        if (purchasePrice) formData.append('cost_price', purchasePrice);
        if (purchaseDescription) formData.append('purchase_description', purchaseDescription);
        formData.append('track_inventory', trackInventory ? '1' : '0');
        if (reorderPoint) formData.append('reorder_point', reorderPoint);

        // Custom Fields for dimensions and weight
        if (dimensionL) formData.append('custom_field[length]', dimensionL);
        if (dimensionW) formData.append('custom_field[width]', dimensionW);
        if (dimensionH) formData.append('custom_field[height]', dimensionH);
        formData.append('custom_field[dimension_unit]', dimensionUnit.value);
        if (weight) formData.append('custom_field[weight]', weight);
        formData.append('custom_field[weight_unit]', weightUnit.value);

        if (selectedBrand) formData.append('brand_id', selectedBrand.value);
        if (selectedCategory) {
            formData.append('category_id', selectedCategory.value);
            formData.append('category_name', selectedCategory.label);
        }

        // Identifiers for single products
        if (detailType === 'Single Item') {
            formData.append('upc', variantAdditionalInfo.upc);
            formData.append('mpn', variantAdditionalInfo.mpn);
            formData.append('ean', variantAdditionalInfo.ean);
            formData.append('isbn', variantAdditionalInfo.isbn);
        }

        if (images.length > 0) {
            formData.append('front_image', images[0]);
        }

        // Add variants if any
        if (detailType !== 'Single Item' && variants.length > 0) {
            // Need to handle variant images separately if possible, or stringify everything but files
            const variantsData = variants.map(v => ({
                id: v.id,
                name: v.name,
                sku: v.sku,
                cost_price: v.costPrice,
                selling_price: v.sellingPrice,
                upc: v.upc,
                mpn: v.mpn,
                ean: v.ean,
                isbn: v.isbn,
                image_url: v.image_url
            }));
            formData.append('variants_json', JSON.stringify({ variants: variantsData }));

            // Add variant images
            variants.forEach((v, idx) => {
                if (v.image instanceof File) {
                    formData.append(`variant_images[${idx}]`, v.image);
                }
            });
        }

        try {
            setLoading(true);
            let resp: any;
            if (id) {
                resp = await productService.updateProduct(id, formData);
            } else {
                resp = await productService.createProduct(formData);
            }

            if (resp.data.success) {
                navigate(-1);
            } else {
                alert('Failed to save product: ' + JSON.stringify(resp.data.errors));
            }
        } catch (err: any) {
            console.error("Save failed", err);
            let errMsg = err.response?.data?.message || err.message;
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const errors = err.response.data.errors;
                errMsg = "Validation Errors:\n" + Object.values(errors).flat().join('\n');
            }
            alert("Error saving product:\n" + errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
            <div className="content">
                <PageHeader title="Settings" badgeCount={false} showModuleTile={false} showExport={false} />
                <SettingsTopbar />
                <div className="row">
                    <div className="col-xl-12 col-lg-12">
                        <div className="card mb-0">
                            <div className="card-body">
                                <div className="border-bottom mb-3 pb-3">
                                    <h5 className="mb-0 fs-17">{id ? 'Edit Product' : 'New Product'}</h5>
                                </div>
                                <form onSubmit={(e) => e.preventDefault()}>

                                    {/* ── Basic Info ── */}
                                    <div className="row mb-3">
                                        {/* LEFT: always col-lg-8 regardless of item type */}
                                        <div className="col-lg-8">
                                            <div className="row">
                                                <div className="col-md-12">
                                                    <div className="row align-items-center mb-3">
                                                        <div className="col-md-2"><label className="form-label mb-0">Name <span className="text-danger">*</span></label></div>
                                                        <div className="col-md-10">
                                                            <input type="text" className="form-control" value={itemName} onChange={(e) => setItemName(e.target.value)} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-12">
                                                    <div className="row align-items-center mb-3">
                                                        <div className="col-md-2"><label className="form-label mb-0">Type <HelpIcon text="Select whether this item is a physical good or a service." id="tooltip-type" /></label></div>
                                                        <div className="col-md-10">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <button type="button" className={`btn btn-sm px-4 ${itemType === 'Goods' ? 'btn-zoho-selected' : 'btn-light border-0 text-muted'}`} onClick={() => setItemType('Goods')}>{itemType === 'Goods' && <i className="ti ti-check me-1 text-danger" />} Goods</button>
                                                                <button type="button" className={`btn btn-sm px-4 ${itemType === 'Service' ? 'btn-zoho-selected' : 'btn-light border-0 text-muted'}`} onClick={() => setItemType('Service')}>{itemType === 'Service' && <i className="ti ti-check me-1 text-danger" />} Service</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-12">
                                                    <div className="row align-items-center mb-3">
                                                        <div className="col-md-2"><label className="form-label mb-0">Category</label></div>
                                                        <div className="col-md-10">
                                                            <CreatableSelect className="custom-react-select" options={categoryOptions} {...searchableSelectProps} inputValue={categorySearch} onInputChange={(val) => setCategorySearch(val)} placeholder="Select or type to create a category" value={selectedCategory} onChange={(val) => setSelectedCategory(val)} onCreateOption={handleCreateCategoryDirectly} menuIsOpen={openMenuId === 'category'} onMenuOpen={() => setOpenMenuId('category')} onMenuClose={() => setOpenMenuId(null)} {...({ menuFooter: (<div className="border-top pt-2 pb-2 px-3 mt-1 bg-white" style={{ position: 'sticky', bottom: 0, zIndex: 1 }}><Link to="#" data-bs-toggle="modal" data-bs-target="#manage-categories-modal" className="text-primary d-flex align-items-center fw-medium" style={{ textDecoration: 'none' }}><i className="ti ti-settings me-2" /> Manage Categories</Link></div>) } as any)} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-12">
                                                    <div className="row align-items-center mb-3">
                                                        <div className="col-md-2"><label className="form-label mb-0">Brand</label></div>
                                                        <div className="col-md-10">
                                                            <CreatableSelect className="custom-react-select" options={brandOptions} {...searchableSelectProps} inputValue={brandSearch} onInputChange={(val) => setBrandSearch(val)} placeholder="Select or type to create a brand" value={selectedBrand} onChange={(val) => setSelectedBrand(val)} onCreateOption={handleCreateBrandDirectly} menuIsOpen={openMenuId === 'brand'} onMenuOpen={() => setOpenMenuId('brand')} onMenuClose={() => setOpenMenuId(null)} {...({ menuFooter: (<div className="border-top pt-2 pb-2 px-3 mt-1 bg-white" style={{ position: 'sticky', bottom: 0, zIndex: 1 }}><Link to="#" data-bs-toggle="modal" data-bs-target="#manage-brands-modal" className="text-primary d-flex align-items-center fw-medium" style={{ textDecoration: 'none' }}><i className="ti ti-settings me-2" /> Manage Brands</Link></div>) } as any)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT: image — only for Single Item */}
                                        {detailType === 'Single Item' && (
                                            <div className="col-lg-4">
                                                <div className="mb-3">
                                                    <label className="form-label">Image</label>
                                                    <div
                                                        className="border border-dashed rounded position-relative overflow-hidden"
                                                        style={{ height: '160px', backgroundColor: images.length > 0 ? 'transparent' : '#f8f9fa', cursor: 'pointer' }}
                                                    >
                                                        {images.length > 0 || previewUrl ? (
                                                            <>
                                                                <img
                                                                    src={images.length > 0 ? URL.createObjectURL(images[0]) : (previewUrl || '')}
                                                                    alt="preview"
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center border-0 shadow-sm"
                                                                    style={{ width: '22px', height: '22px', borderRadius: '0 0 0 4px', zIndex: 10 }}
                                                                    onClick={() => { setImages([]); setPreviewUrl(null); }}
                                                                >
                                                                    <i className="ti ti-x" style={{ fontSize: '11px' }} />
                                                                </button>
                                                                <label
                                                                    className="position-absolute bottom-0 start-0 end-0 d-flex align-items-center justify-content-center"
                                                                    style={{ height: '28px', background: 'rgba(0,0,0,0.45)', cursor: 'pointer' }}
                                                                >
                                                                    <span className="text-white" style={{ fontSize: '11px' }}><i className="ti ti-pencil me-1" />Change</span>
                                                                    <input type="file" className="d-none" accept="image/png,image/jpeg,image/webp" onChange={(e) => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0], (f) => { setImages([f]); setPreviewUrl(null); }); }} />
                                                                </label>
                                                            </>
                                                        ) : (
                                                            <label className="w-100 h-100 d-flex flex-column align-items-center justify-content-center" style={{ cursor: 'pointer' }}>
                                                                <div className="bg-white border rounded-circle d-flex align-items-center justify-content-center mb-2" style={{ width: '40px', height: '40px' }}>
                                                                    <i className="ti ti-upload fs-20 text-primary" />
                                                                </div>
                                                                <h6 className="fw-bold mb-1 fs-14">Product Image</h6>
                                                                <span className="text-primary fw-medium fs-13">Click to upload</span>
                                                                <p className="extra-small text-muted mb-0 mt-1">PNG, JPG, WEBP</p>
                                                                <input type="file" className="d-none" accept="image/png,image/jpeg,image/webp" onChange={(e) => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0], (f) => setImages([f])); }} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Item Details ── */}
                                    <div className="mb-3 mt-4 pt-4 border-top">
                                        <h6 className="mb-1">Item Details</h6>
                                        <p className="mb-0">Provide the information below</p>
                                    </div>
                                    <div className="row mb-4 align-items-center">
                                        <div className="col-md-2"><label className="form-label mb-0">Item Type</label></div>
                                        <div className="col-md-4">
                                            <div className="d-flex align-items-center gap-2">
                                                <button type="button" className={`btn btn-sm px-4 ${detailType === 'Single Item' ? 'btn-zoho-selected' : 'btn-light border-0 text-muted'}`} onClick={() => setDetailType('Single Item')}>{detailType === 'Single Item' && <i className="ti ti-check me-1 text-danger" />} Single Item</button>
                                                <button type="button" className={`btn btn-sm px-4 ${detailType === 'Contains Variants' ? 'btn-zoho-selected' : 'btn-light border-0 text-muted'}`} onClick={() => setDetailType('Contains Variants')}>{detailType === 'Contains Variants' && <i className="ti ti-check me-1 text-zoho-blue" />} Contains Variants</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row g-4 mb-4 mt-1">
                                        <div className="col-md-6">
                                            <div className="row align-items-center mb-3">
                                                <div className="col-md-4"><label className="form-label mb-0">Unit <span className="text-danger">*</span> <HelpIcon text="The item will be measured in terms of this unit" id="tooltip-unit" /></label></div>
                                                <div className="col-md-8">
                                                    <CreatableSelect className="custom-react-select" options={units} styles={customStyles} theme={neutralTheme} components={{ IndicatorSeparator: () => null, DropdownIndicator, Control: SearchControl, Option: UnitOption }} isSearchable placeholder="Select or type to add" value={selectedUnit} onChange={(val) => setSelectedUnit(val)} menuIsOpen={openMenuId === 'unit'} onMenuOpen={() => setOpenMenuId('unit')} onMenuClose={() => setOpenMenuId(null)} onCreateOption={(inputValue) => { const n = { value: inputValue.toLowerCase(), label: `${inputValue.toUpperCase()} - ${inputValue.toLowerCase()}` }; setUnits([...units, n]); setSelectedUnit(n); }} />
                                                </div>
                                            </div>
                                            {detailType === 'Single Item' && !showIdentifiers && (
                                                <div className="row"><div className="col-md-4"></div><div className="col-md-8"><Link to="#" className="text-primary small fw-medium" onClick={() => setShowIdentifiers(true)}><i className="ti ti-plus me-1" /> Add Identifier</Link></div></div>
                                            )}
                                        </div>
                                        {detailType === 'Single Item' && (
                                            <div className="col-md-6"><div className="row align-items-center mb-3"><div className="col-md-4"><label className="form-label mb-0">SKU <HelpIcon text="Stock Keeping Unit" id="tooltip-sku" /></label></div><div className="col-md-8"><input type="text" className="form-control" value={sku} onChange={(e) => setSku(e.target.value)} /></div></div></div>
                                        )}
                                        {detailType === 'Single Item' && showIdentifiers && (
                                            <>
                                                <div className="col-md-6 animate__animated animate__fadeIn">
                                                    <div className="row align-items-center mb-3"><div className="col-md-4"><label className="form-label mb-0 d-flex align-items-center">UPC <HelpIcon text="Universal Product Code" id="single-upc" /></label></div><div className="col-md-8"><input type="text" className="form-control" value={variantAdditionalInfo.upc} onChange={(e) => setVariantAdditionalInfo({ ...variantAdditionalInfo, upc: e.target.value })} /></div></div>
                                                    <div className="row align-items-center mb-3"><div className="col-md-4"><label className="form-label mb-0 d-flex align-items-center">EAN <HelpIcon text="European Article Number" id="single-ean" /></label></div><div className="col-md-8"><input type="text" className="form-control" value={variantAdditionalInfo.ean} onChange={(e) => setVariantAdditionalInfo({ ...variantAdditionalInfo, ean: e.target.value })} /></div></div>
                                                </div>
                                                <div className="col-md-6 animate__animated animate__fadeIn">
                                                    <div className="row align-items-center mb-3"><div className="col-md-4"><label className="form-label mb-0 d-flex align-items-center">MPN <HelpIcon text="Manufacturer Part Number" id="single-mpn" /></label></div><div className="col-md-8"><input type="text" className="form-control" value={variantAdditionalInfo.mpn} onChange={(e) => setVariantAdditionalInfo({ ...variantAdditionalInfo, mpn: e.target.value })} /></div></div>
                                                    <div className="row align-items-center mb-3"><div className="col-md-4"><label className="form-label mb-0 d-flex align-items-center">ISBN <HelpIcon text="International Standard Book Number" id="single-isbn" /></label></div><div className="col-md-8"><input type="text" className="form-control" value={variantAdditionalInfo.isbn} onChange={(e) => setVariantAdditionalInfo({ ...variantAdditionalInfo, isbn: e.target.value })} /></div></div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* ── Contains Variants ── */}
                                    {detailType === 'Contains Variants' && (
                                        <div className="animate__animated animate__fadeIn mt-4 pt-4 border-top">
                                            <div className="mb-3"><h6 className="mb-1">Variations</h6></div>

                                            {attributes.map((attr) => (
                                                <div key={attr.id} className="row mb-3 align-items-start">
                                                    <div className="col-md-2"><label className="form-label mt-2">Attribute</label></div>
                                                    <div className="col-md-3"><input type="text" className="form-control" placeholder="eg: color" value={attr.name} onChange={(e) => handleAttributeChange(attr.id, 'name', e.target.value)} /></div>
                                                    <div className="col-md-6">
                                                        <div className="row align-items-center">
                                                            <div className="col-md-2 text-end"><label className="form-label mb-0">Options</label></div>
                                                            <div className="col-md-10">
                                                                <CreatableSelect
                                                                    isMulti
                                                                    placeholder="eg: Red, Blue"
                                                                    styles={customStyles}
                                                                    theme={neutralTheme}
                                                                    value={attr.options}
                                                                    inputValue={attrInputValues[attr.id] || ''}
                                                                    onInputChange={(val) => setAttrInputValues(prev => ({ ...prev, [attr.id]: val }))}
                                                                    onChange={(val: any) => handleAttributeChange(attr.id, 'options', val || [])}
                                                                    components={{ DropdownIndicator: null, IndicatorSeparator: null }}
                                                                    onKeyDown={(e: any) => {
                                                                        if (e.key === ',' || e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            const inputVal = (attrInputValues[attr.id] || '').trim();
                                                                            if (inputVal) {
                                                                                const newOpt = { value: inputVal, label: inputVal };
                                                                                handleAttributeChange(attr.id, 'options', [...attr.options, newOpt]);
                                                                                setAttrInputValues(prev => ({ ...prev, [attr.id]: '' }));
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-1 pt-2 text-end">
                                                        {attributes.length > 1 && (
                                                            <Link to="#" className="text-danger" onClick={() => handleRemoveAttribute(attr.id)}><i className="ti ti-trash" /></Link>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="row mb-4">
                                                <div className="col-md-2"></div>
                                                <div className="col-md-10">
                                                    <Link to="#" className="text-zoho-blue fw-medium" onClick={handleAddAttribute}><i className="ti ti-plus me-1" /> Add more attributes</Link>
                                                </div>
                                            </div>

                                            {/* ── Variants Table ── */}
                                            {variants.length > 0 && (
                                                <div className="variants-section mt-5 animate__animated animate__fadeIn">
                                                    <div className="section-header mb-3"><h6 className="mb-1">Variants</h6></div>
                                                    <div className="table-responsive border rounded bg-white">
                                                        <table className="table table-nowrap mb-0 border-0" style={{ width: '100%' }}>
                                                            <colgroup>
                                                                <col style={{ width: '72px' }} />
                                                                <col style={{ width: '22%' }} />
                                                                <col style={{ width: '22%' }} />
                                                                <col style={{ width: '22%' }} />
                                                                <col style={{ width: '22%' }} />
                                                                <col style={{ width: '7%' }} />
                                                            </colgroup>
                                                            <thead className="bg-light">
                                                                <tr>
                                                                    <th className="border-0 align-middle">IMAGE</th>
                                                                    <th className="border-0 align-middle">ITEM NAME*</th>
                                                                    <th className="border-0 align-top">
                                                                        SKU <HelpIcon text="Stock Keeping Unit" id="sku-tip" />
                                                                        <div className="mt-1">
                                                                            <Link to="#" className="text-zoho-blue fs-11 fw-normal d-inline-flex align-items-center" data-bs-toggle="modal" data-bs-target="#generate-sku-modal">
                                                                                <i className="ti ti-copy me-1 fs-13" /> Generate SKU
                                                                            </Link>
                                                                        </div>
                                                                    </th>
                                                                    <th className="border-0 align-top">
                                                                        COST PRICE (₹)*
                                                                        <div className="mt-1">
                                                                            <Link to="#" className="text-zoho-blue fs-11 fw-normal" onClick={() => handleCopyAll('costPrice', variants[0].costPrice)}>COPY TO ALL</Link>
                                                                        </div>
                                                                    </th>
                                                                    <th className="border-0 align-top">
                                                                        SELLING PRICE (₹)*
                                                                        <div className="mt-1">
                                                                            <Link to="#" className="text-zoho-blue fs-11 fw-normal" onClick={() => handleCopyAll('sellingPrice', variants[0].sellingPrice)}>COPY TO ALL</Link>
                                                                        </div>
                                                                    </th>
                                                                    <th className="border-0 text-center align-middle"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {variants.map((variant, vIndex) => (
                                                                    <tr key={variant.id}>
                                                                        {/* IMAGE */}
                                                                        <td className="border-0 py-2 align-middle text-center">
                                                                            <label
                                                                                className="d-inline-flex flex-column align-items-center justify-content-center border rounded position-relative overflow-hidden"
                                                                                style={{ width: '52px', height: '52px', borderStyle: 'dashed', borderColor: (variant.image || variant.image_url) ? '#e41f07' : '#d0d5dd', cursor: 'pointer', backgroundColor: (variant.image || variant.image_url) ? 'transparent' : '#f9fafb', transition: 'border-color 0.2s' }}
                                                                                onMouseEnter={e => (e.currentTarget.style.borderColor = '#e41f07')}
                                                                                onMouseLeave={e => (e.currentTarget.style.borderColor = (variant.image || variant.image_url) ? '#e41f07' : '#d0d5dd')}
                                                                            >
                                                                                {variant.image || variant.image_url ? (
                                                                                    <>
                                                                                        <img src={variant.image ? URL.createObjectURL(variant.image) : variant.image_url} alt={variant.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                                                                                        <button type="button" className="btn btn-danger position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center border-0"
                                                                                            style={{ width: '16px', height: '16px', borderRadius: '0 4px 0 4px', zIndex: 2 }}
                                                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVariantImageChange(vIndex, null); }}>
                                                                                            <i className="ti ti-x" style={{ fontSize: '9px' }} />
                                                                                        </button>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <i className="ti ti-camera text-muted" style={{ fontSize: '18px' }} />
                                                                                        <span className="text-muted lh-1 mt-1" style={{ fontSize: '9px' }}>Add</span>
                                                                                    </>
                                                                                )}
                                                                                <input type="file" className="d-none" accept="image/png,image/jpeg,image/webp" onChange={(e) => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0], (f) => handleVariantImageChange(vIndex, f)); }} />
                                                                            </label>
                                                                        </td>
                                                                        {/* ITEM NAME */}
                                                                        <td className="border-0 py-2 align-middle">
                                                                            <input
                                                                                type="text"
                                                                                className="form-control form-control-sm"
                                                                                style={{ borderColor: '#e3e3e3', boxShadow: 'none', height: variantRowH }}
                                                                                value={variant.name}
                                                                                onChange={(e) => { const nv = [...variants]; nv[vIndex].name = e.target.value; setVariants(nv); }}
                                                                            />
                                                                        </td>
                                                                        {/* SKU */}
                                                                        <td className="border-0 py-2 align-middle">
                                                                            <input type="text" className="form-control form-control-sm" style={{ borderColor: '#e3e3e3', boxShadow: 'none', height: variantRowH }} value={variant.sku} onChange={(e) => { const nv = [...variants]; nv[vIndex].sku = e.target.value; setVariants(nv); }} />
                                                                        </td>
                                                                        {/* COST PRICE */}
                                                                        <td className="border-0 py-2 align-middle">
                                                                            <input type="text" className="form-control form-control-sm text-end" style={{ borderColor: '#e3e3e3', boxShadow: 'none', height: variantRowH }} value={variant.costPrice} onChange={(e) => { const nv = [...variants]; nv[vIndex].costPrice = e.target.value; setVariants(nv); }} />
                                                                        </td>
                                                                        {/* SELLING PRICE */}
                                                                        <td className="border-0 py-2 align-middle">
                                                                            <input type="text" className="form-control form-control-sm text-end" style={{ borderColor: '#e3e3e3', boxShadow: 'none', height: variantRowH }} value={variant.sellingPrice} onChange={(e) => { const nv = [...variants]; nv[vIndex].sellingPrice = e.target.value; setVariants(nv); }} />
                                                                        </td>
                                                                        {/* Actions */}
                                                                        <td className="border-0 text-center align-middle py-2">
                                                                            <div className="d-flex align-items-center justify-content-center gap-2">
                                                                                <Link to="#" className="text-muted" onClick={(e) => { e.preventDefault(); handleOpenIdentifiersModal(variant); }}><i className="ti ti-pencil" /></Link>
                                                                                <Link to="#" className="text-danger" onClick={(e) => { e.preventDefault(); setVariants(variants.filter(v => v.id !== variant.id)); }}><i className="ti ti-circle-x" /></Link>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ── Item Description ── */}
                                    <div className="mt-4 pt-4 border-top">
                                        <div className="mb-3"><h6 className="mb-1">Item Description</h6><p className="mb-0">Provide the information below</p></div>
                                        <div className="row mb-5 pb-4 border-bottom align-items-center">
                                            <div className="col-md-2"><label className="form-label mb-0">Description</label></div>
                                            <div className="col-md-4"><textarea className="form-control" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                                        </div>
                                    </div>

                                    {/* ── Sales Information ── */}
                                    <div className="form-check mb-3 mt-4 pt-4 border-top">
                                        <input className="form-check-input" type="checkbox" id="salesInfo" defaultChecked />
                                        <label className="form-check-label h6 mb-0 ms-1" htmlFor="salesInfo">Sales Information</label>
                                    </div>
                                    <div className="row mb-5 pb-4 border-bottom">
                                        {detailType === 'Single Item' && (
                                            <div className="col-md-12">
                                                <div className="row align-items-center mb-3">
                                                    <div className="col-md-2"><label className="form-label mb-0">Selling Price <span className="text-danger">*</span></label></div>
                                                    <div className="col-md-4"><div className="input-group"><span className="input-group-text bg-light text-muted small">INR</span><input type="text" className="form-control" value={salesPrice} onChange={(e) => setSalesPrice(e.target.value)} /></div></div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="col-md-12">
                                            <div className="row align-items-top">
                                                <div className="col-md-2"><label className="form-label mt-1">Description</label></div>
                                                <div className="col-md-4"><textarea className="form-control" rows={3} value={salesDescription} onChange={(e) => setSalesDescription(e.target.value)} /></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Purchase Information ── */}
                                    <div className="form-check mb-3 mt-4 pt-4 border-top">
                                        <input className="form-check-input" type="checkbox" id="purchaseInfo" defaultChecked />
                                        <label className="form-check-label h6 mb-0 ms-1" htmlFor="purchaseInfo">Purchase Information</label>
                                    </div>
                                    <div className="row mb-5 pb-4 border-bottom">
                                        {detailType === 'Single Item' && (
                                            <div className="col-md-12">
                                                <div className="row align-items-center mb-3">
                                                    <div className="col-md-2"><label className="form-label mb-0">Cost Price <span className="text-danger">*</span></label></div>
                                                    <div className="col-md-4"><div className="input-group"><span className="input-group-text bg-light text-muted small">INR</span><input type="text" className="form-control" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} /></div></div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="col-md-12">
                                            <div className="row align-items-center mb-3">
                                                <div className="col-md-2"><label className="form-label mb-0">Preferred Vendor</label></div>
                                                <div className="col-md-4"><Select className="custom-react-select" options={vendors} {...searchableSelectProps} inputValue={vendorSearch} onInputChange={(val) => setVendorSearch(val)} value={selectedVendor} onChange={(val) => setSelectedVendor(val)} placeholder="Select Vendor" menuIsOpen={openMenuId === 'vendor'} onMenuOpen={() => setOpenMenuId('vendor')} onMenuClose={() => setOpenMenuId(null)} /></div>
                                            </div>
                                        </div>
                                        <div className="col-md-12">
                                            <div className="row align-items-top">
                                                <div className="col-md-2"><label className="form-label mt-1">Description</label></div>
                                                <div className="col-md-4"><textarea className="form-control" rows={3} value={purchaseDescription} onChange={(e) => setPurchaseDescription(e.target.value)} /></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Inventory ── */}
                                    <div className="form-check mb-1 mt-4 pt-4 border-top">
                                        <input className="form-check-input" type="checkbox" id="trackInv" checked={trackInventory} onChange={(e) => setTrackInventory(e.target.checked)} />
                                        <label className="form-check-label h6 mb-0 ms-1" htmlFor="trackInv">Track Inventory for this item <HelpIcon text="Enable this option to track stock" id="tooltip-track-inv" /></label>
                                    </div>
                                    <p className="small text-muted mb-4 ms-4">You cannot enable/disable inventory tracking once you have created transactions for this item</p>
                                    {trackInventory && (
                                        <div className="row animate__animated animate__fadeIn mb-5 pb-4">
                                            <div className="col-md-6"><div className="row align-items-center mb-3"><div className="col-md-4"><label className="form-label mb-0">Inventory Account <span className="text-danger">*</span></label></div><div className="col-md-8"><Select className="custom-react-select" options={inventoryAccountOptions} {...searchableSelectProps} inputValue={invAccountSearch} onInputChange={(val) => setInvAccountSearch(val)} value={selectedInventoryAccount || inventoryAccountOptions[0].options[0]} onChange={(val) => setSelectedInventoryAccount(val)} placeholder="Select an account" menuIsOpen={openMenuId === 'invAccount'} onMenuOpen={() => setOpenMenuId('invAccount')} onMenuClose={() => setOpenMenuId(null)} /></div></div></div>
                                            <div className="col-md-6"><div className="row align-items-center mb-3"><div className="col-md-4"><label className="form-label mb-0">Inventory Valuation</label></div><div className="col-md-8"><Select className="custom-react-select" options={valuationMethods} {...searchableSelectProps} inputValue={valuationSearch} onInputChange={(val) => setValuationSearch(val)} value={selectedValuation} onChange={(val) => setSelectedValuation(val)} placeholder="Select the valuation method" menuIsOpen={openMenuId === 'valuation'} onMenuOpen={() => setOpenMenuId('valuation')} onMenuClose={() => setOpenMenuId(null)} /></div></div></div>
                                            {detailType === 'Single Item' && (
                                                <div className="col-md-12"><div className="row align-items-center mb-0"><div className="col-md-2"><label className="form-label mb-0">Reorder Point</label></div><div className="col-md-4"><input type="text" className="form-control" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} /></div></div></div>
                                            )}
                                        </div>
                                    )}

                                    {/* ── Returns ── */}
                                    <div className="section-header mb-4 pt-4 border-top">
                                        <h6 className="mb-1">Cancellation and Returns</h6>
                                        <p className="mb-0">Provide the information below</p>
                                    </div>
                                    <div className="row mb-5 pb-4 align-items-center">
                                        <div className="col-md-2"><label className="form-label mb-0">Returnable Item</label></div>
                                        <div className="col-md-4">
                                            <div className="d-flex align-items-center gap-4">
                                                <div className="form-check mb-0"><input className="form-check-input" type="radio" name="returnable" id="retYes" checked={isReturnable === 'Yes'} onChange={() => setIsReturnable('Yes')} /><label className="form-check-label" htmlFor="retYes">Yes</label></div>
                                                <div className="form-check mb-0"><input className="form-check-input" type="radio" name="returnable" id="retNo" checked={isReturnable === 'No'} onChange={() => setIsReturnable('No')} /><label className="form-check-label" htmlFor="retNo">No</label></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Fulfilment Details ── */}
                                    {detailType === 'Single Item' && (
                                        <>
                                            <div className="section-header mb-4 pt-4 border-top"><h6 className="mb-1">Fulfilment Details</h6><p className="mb-0">Provide the information below</p></div>
                                            <div className="row mb-5">
                                                <div className="col-md-6">
                                                    <div className="row align-items-center mb-3">
                                                        <div className="col-md-4"><label className="form-label mb-0">Dimensions</label></div>
                                                        <div className="col-md-8">
                                                            <div className="input-group input-group-sm">
                                                                <input type="text" className="form-control text-center" placeholder="L" value={dimensionL} onChange={(e) => setDimensionL(e.target.value)} />
                                                                <input type="text" className="form-control text-center" placeholder="W" value={dimensionW} onChange={(e) => setDimensionW(e.target.value)} />
                                                                <input type="text" className="form-control text-center" placeholder="H" value={dimensionH} onChange={(e) => setDimensionH(e.target.value)} />
                                                                <div style={{ width: '60px' }}><Select className="custom-react-select" options={dimensionUnits} value={dimensionUnit} onChange={(val: any) => setDimensionUnit(val)} styles={unitSelectStyles} components={{ IndicatorSeparator: () => null, DropdownIndicator }} isSearchable={false} menuIsOpen={openMenuId === 'dimUnit'} onMenuOpen={() => setOpenMenuId('dimUnit')} onMenuClose={() => setOpenMenuId(null)} /></div>
                                                            </div>
                                                            <div className="extra-small mt-1 text-muted">(Length X Width X Height)</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="row align-items-center mb-3">
                                                        <div className="col-md-4"><label className="form-label mb-0">Weight</label></div>
                                                        <div className="col-md-8">
                                                            <div className="input-group input-group-sm">
                                                                <input type="text" className="form-control" value={weight} onChange={(e) => setWeight(e.target.value)} />
                                                                <div style={{ width: '60px' }}><Select className="custom-react-select" options={weightUnits} value={weightUnit} onChange={(val: any) => setWeightUnit(val)} styles={unitSelectStyles} components={{ IndicatorSeparator: () => null, DropdownIndicator }} isSearchable={false} menuIsOpen={openMenuId === 'weightUnit'} onMenuOpen={() => setOpenMenuId('weightUnit')} onMenuClose={() => setOpenMenuId(null)} /></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="d-flex align-items-center justify-content-end flex-wrap gap-2 pt-4">
                                        <button type="button" className="btn btn-sm btn-light" onClick={() => navigate(-1)}>Cancel</button>
                                        <button type="button" className="btn btn-sm btn-primary" onClick={handleSave}>Save</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Modals ─── */}
            <div className="modal fade" id="generate-sku-modal" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content border-0 rounded-3">
                        <div className="modal-header border-bottom-0 pb-0 px-4 pt-4"><h5 className="modal-title fw-medium fs-5">Generate SKU <span className="text-danger">-</span></h5><button type="button" className="btn-close" data-bs-dismiss="modal" /></div>
                        <div className="modal-body px-4 py-3">
                            <div className="alert d-flex align-items-center mb-4" role="alert" style={{ backgroundColor: '#f0f4fa', color: '#172b4d', border: 'none', borderRadius: '8px', padding: '12px 16px' }}>
                                <i className="ti ti-info-circle fs-5 me-2" style={{ color: '#e41f07' }} />
                                <span className="fs-13">Some of the item variants already have SKUs. On proceeding to auto-generate, the current SKUs will be replaced with new values.</span>
                            </div>
                            <p className="fw-medium text-dark mb-4 fs-14">Select attributes that you would like to generate the SKU from</p>
                            <div className="table-responsive border rounded bg-light mb-3">
                                <table className="table table-borderless table-sm mb-0" style={{ minWidth: '600px' }}>
                                    <thead>
                                        <tr className="text-uppercase" style={{ fontSize: '11px', color: '#999' }}>
                                            <th className="fw-semibold ps-3" style={{ width: '28%' }}>Select Attribute</th>
                                            <th className="fw-semibold" style={{ width: '28%' }}>Show</th>
                                            <th className="fw-semibold" style={{ width: '22%' }}>Letter Case</th>
                                            <th className="fw-semibold" style={{ width: '15%' }}>Separator</th>
                                            <th className="fw-semibold text-center" style={{ width: '7%' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {skuFormat.map((format, index) => (
                                            <tr key={format.id}>
                                                <td><select className="form-select form-select-sm shadow-none" style={{ borderColor: '#e3e3e3' }} value={format.label} onChange={(e) => updateSkuFormat(format.id, 'label', e.target.value)}><option value="">Select</option>{['Item Name', 'Custom Text', ...attributes.filter(a => a.name.trim() !== '').map(a => a.name)].map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></td>
                                                <td>{format.label === 'Custom Text' ? (<input type="text" className="form-control form-control-sm shadow-none" placeholder="Enter custom text" value={format.customValue || ''} onChange={(e) => updateSkuFormat(format.id, 'customValue', e.target.value)} style={{ borderColor: '#e3e3e3' }} />) : (<div className="input-group input-group-sm"><select className="form-select shadow-none" style={{ borderColor: '#e3e3e3', borderRight: format.showType === 'Full' ? '1px solid #e3e3e3' : 'none', borderTopRightRadius: format.showType === 'Full' ? '4px' : '0', borderBottomRightRadius: format.showType === 'Full' ? '4px' : '0' }} value={format.showType} onChange={(e) => updateSkuFormat(format.id, 'showType', e.target.value)}><option>First</option><option>Last</option><option>Full</option></select>{format.showType !== 'Full' && <input type="number" min="1" className="form-control text-center shadow-none px-1" value={format.length} onChange={(e) => updateSkuFormat(format.id, 'length', parseInt(e.target.value) || 1)} style={{ maxWidth: '45px', borderColor: '#e3e3e3' }} />}</div>)}</td>
                                                <td><select className="form-select form-select-sm shadow-none" style={{ borderColor: '#e3e3e3' }} value={format.letterCase} onChange={(e) => updateSkuFormat(format.id, 'letterCase', e.target.value)}><option>Upper Case</option><option>Lower Case</option><option>None</option></select></td>
                                                <td>{index !== skuFormat.length - 1 && <select className="form-select form-select-sm shadow-none" style={{ borderColor: '#e3e3e3' }} value={format.separator} onChange={(e) => updateSkuFormat(format.id, 'separator', e.target.value)}><option>-</option><option>_</option><option>/</option><option>\</option><option>.</option><option>None</option></select>}</td>
                                                <td className="text-center align-middle"><Link to="#" className="text-danger d-inline-flex align-items-center" onClick={(e: any) => { e.preventDefault(); handleRemoveSkuFormat(format.id); }}><i className="ti ti-circle-minus fs-5" /></Link></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Link to="#" className="text-zoho-blue fw-medium fs-13" onClick={(e: any) => { e.preventDefault(); handleAddSkuFormat(); }}><i className="ti ti-plus me-1" /> Add Attribute</Link>
                            <div className="mt-4">
                                <h6 className="mb-2 fs-13 fw-semibold text-dark">SKU Preview</h6>
                                <div className="p-4 rounded border text-center d-flex align-items-center justify-content-center" style={{ backgroundColor: '#fffcf2', backgroundImage: 'radial-gradient(#e5e5e5 1px, transparent 1px)', backgroundSize: '15px 15px', minHeight: '90px', borderColor: '#f2e8c2' }}>
                                    <h5 className="mb-0 fw-semibold text-dark">{previewSku()}</h5>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer border-top-0 pt-0 px-4 pb-4 justify-content-start gap-2">
                            <button type="button" className="btn px-4 py-2 fw-medium" style={{ backgroundColor: '#e41f07', color: '#fff' }} data-bs-dismiss="modal" onClick={handleGenerateSkuIds}>Generate SKU</button>
                            <button type="button" className="btn btn-light border px-4 py-2 fw-medium" data-bs-dismiss="modal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal fade" id="manage-categories-modal" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content border-0 rounded-3">
                        <div className="modal-header border-bottom-0 pb-0"><h5 className="modal-title fw-medium fs-5">Manage Categories</h5><button type="button" className="btn-close" data-bs-dismiss="modal" /></div>
                        <div className="modal-body px-4 py-4">
                            {showNewCategory && (<div className="mb-4"><div className="row mb-3 align-items-center"><div className="col-md-4"><label className="form-label mb-0"><span className="text-danger">Category Name*</span></label></div><div className="col-md-8"><input type="text" className="form-control" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /></div></div><div className="d-flex gap-2 mt-3"><button type="button" className="btn btn-primary btn-sm px-3" onClick={handleAddCategory}>Save</button><button type="button" className="btn btn-light btn-sm px-3 border" onClick={() => setShowNewCategory(false)}>Cancel</button></div><div className="mt-4" /></div>)}
                            <div className="d-flex align-items-center justify-content-between mb-3 mt-2">
                                <h6 className="text-uppercase mb-0 text-dark fw-semibold" style={{ fontSize: '12px' }}>
                                    CATEGORIES
                                    <Link to="#" className="ms-2 text-muted" onClick={(e: any) => { e.preventDefault(); fetchInitialData(); }} title="Refresh list"><i className="ti ti-refresh" /></Link>
                                </h6>
                                {!showNewCategory && <Link to="#" className="text-primary d-flex align-items-center fw-medium" onClick={() => setShowNewCategory(true)}><i className="ti ti-circle-plus me-1" /> Add New Category</Link>}
                            </div>
                            <div className="list-group list-group-flush border rounded-3 overflow-hidden mt-2">{categories.filter(c => !(c as any).isDeleted).map(c => (<div key={c.id} className="list-group-item d-flex align-items-center justify-content-between px-3 py-3 border-bottom border-light"><div className="d-flex align-items-center"><i className="ti ti-folder text-primary me-2 fs-5" /><span className="fw-medium text-dark">{c.name}</span></div><div className="d-flex align-items-center gap-2"><Link to="#" className="text-muted" onClick={() => handleEditCategoryClick(c.id, c.name)}><i className="ti ti-edit" /></Link><Link to="#" className="text-danger" onClick={() => handleSoftDeleteCategory(c.id)}><i className="ti ti-trash" /></Link></div></div>))}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal fade" id="manage-brands-modal" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content border-0 rounded-3">
                        <div className="modal-header border-bottom-0 pb-0"><h5 className="modal-title fw-medium fs-5">Manage Brands</h5><button type="button" className="btn-close" data-bs-dismiss="modal" /></div>
                        <div className="modal-body px-4 py-4">
                            {showNewBrand && (<div className="mb-4"><div className="row mb-3 align-items-center"><div className="col-md-4"><label className="form-label mb-0"><span className="text-danger">Brand Name*</span></label></div><div className="col-md-8"><input type="text" className="form-control" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} /></div></div><div className="d-flex gap-2 mt-3"><button type="button" className="btn btn-primary btn-sm px-3" onClick={handleAddBrand}>Save</button><button type="button" className="btn btn-light btn-sm px-3 border" onClick={() => setShowNewBrand(false)}>Cancel</button></div><div className="mt-4" /></div>)}
                            <div className="d-flex align-items-center justify-content-between mb-3 mt-2">
                                <h6 className="text-uppercase mb-0 text-dark fw-semibold" style={{ fontSize: '12px' }}>
                                    BRANDS
                                    <Link to="#" className="ms-2 text-muted" onClick={(e: any) => { e.preventDefault(); fetchInitialData(); }} title="Refresh list"><i className="ti ti-refresh" /></Link>
                                </h6>
                                {!showNewBrand && <Link to="#" className="text-primary d-flex align-items-center fw-medium" onClick={() => setShowNewBrand(true)}><i className="ti ti-circle-plus me-1" /> Add New Brand</Link>}
                            </div>
                            <div className="list-group list-group-flush border rounded-3 overflow-hidden mt-2">{brands.filter(b => !(b as any).isDeleted).map(b => (<div key={b.id} className="list-group-item d-flex align-items-center justify-content-between px-3 py-3 border-bottom border-light"><span className="fw-medium text-dark">{b.name}</span><div className="d-flex align-items-center gap-2"><Link to="#" className="text-muted" onClick={() => handleEditBrandClick(b.id, b.name)}><i className="ti ti-edit" /></Link><Link to="#" className="text-danger" onClick={() => handleSoftDeleteBrand(b.id)}><i className="ti ti-trash" /></Link></div></div>))}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal fade" id="identifiers-modal" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content border-0 rounded-3">
                        <div className="modal-header border-bottom-0 pb-0 px-4 pt-4"><h5 className="modal-title fw-medium fs-5">Additional Information</h5><button type="button" className="btn-close" data-bs-dismiss="modal" /></div>
                        <div className="modal-body px-4 py-4">
                            <h6 className="mb-4 fw-semibold text-dark">Identifiers</h6>
                            <div className="row g-4">
                                <div className="col-md-6"><div className="row align-items-center"><div className="col-md-4"><label className="form-label mb-0 text-dark">UPC <HelpIcon text="Universal Product Code" id="tip-upc" /></label></div><div className="col-md-8"><input type="text" className="form-control" value={variantAdditionalInfo.upc} onChange={(e) => setVariantAdditionalInfo({ ...variantAdditionalInfo, upc: e.target.value })} /></div></div></div>
                                <div className="col-md-6"><div className="row align-items-center"><div className="col-md-4"><label className="form-label mb-0 text-dark">MPN <HelpIcon text="Manufacturer Part Number" id="tip-mpn" /></label></div><div className="col-md-8"><input type="text" className="form-control" value={variantAdditionalInfo.mpn} onChange={(e) => setVariantAdditionalInfo({ ...variantAdditionalInfo, mpn: e.target.value })} /></div></div></div>
                                <div className="col-md-6"><div className="row align-items-center"><div className="col-md-4"><label className="form-label mb-0 text-dark">EAN <HelpIcon text="European Article Number" id="tip-ean" /></label></div><div className="col-md-8"><input type="text" className="form-control" value={variantAdditionalInfo.ean} onChange={(e) => setVariantAdditionalInfo({ ...variantAdditionalInfo, ean: e.target.value })} /></div></div></div>
                                <div className="col-md-6"><div className="row align-items-center"><div className="col-md-4"><label className="form-label mb-0 text-dark">ISBN <HelpIcon text="International Standard Book Number" id="tip-isbn" /></label></div><div className="col-md-8"><input type="text" className="form-control" value={variantAdditionalInfo.isbn} onChange={(e) => setVariantAdditionalInfo({ ...variantAdditionalInfo, isbn: e.target.value })} /></div></div></div>
                            </div>
                        </div>
                        <div className="modal-footer border-top-0 pt-0 px-4 pb-4 justify-content-start gap-2">
                            <button type="button" className="btn px-4 py-2 fw-medium" style={{ backgroundColor: '#e41f07', color: '#fff' }} onClick={handleSaveIdentifiers}>Save</button>
                            <button type="button" className="btn btn-light border px-4 py-2 fw-medium" data-bs-dismiss="modal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Product;