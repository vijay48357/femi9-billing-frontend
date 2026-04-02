import React, { useState, useEffect, useCallback, useRef } from 'react';
import "../billing-application.scss";
import { Link } from "react-router-dom";
import Footer from "../../../../components/footer/footer";
import PageHeader from "../../../../components/page-header/pageHeader";
import SearchInput from "../../../../components/dataTable/dataTableSearch";
import SettingsTopbar from "../../settings/settings-topbar/settingsTopbar";
import api from '../../../../api/axios';
import CommonSelect from "../../../../components/common-select/commonSelect";
import { Input_Type, Module } from "../../../../core/json/selectOption";

/* ═══════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════ */
interface ToastItem {
  id: number;
  type: 'success' | 'danger' | 'warning' | 'info';
  title: string;
  message: string;
}
const toastColors: Record<ToastItem['type'], { alertClass: string; icon: string }> = {
  success: { alertClass: 'alert-success', icon: 'ti ti-checks' },
  danger: { alertClass: 'alert-danger', icon: 'ti ti-trash-x' },
  warning: { alertClass: 'alert-warning', icon: 'ti ti-alert-triangle' },
  info: { alertClass: 'alert-info', icon: 'ti ti-info-circle' },
};

const ToastContainer: React.FC<{ toasts: ToastItem[]; onClose: (id: number) => void }> = ({ toasts, onClose }) => (
  <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '280px', maxWidth: 'calc(100vw - 32px)' }}>
    {toasts.map(t => {
      const c = toastColors[t.type];
      return (
        <div key={t.id} className={`alert ${c.alertClass} alert-dismissible d-flex align-items-start mb-0`} role="alert" style={{ animation: 'slideIn 0.3s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}>
          <i className={`${c.icon} f-16 me-2 mt-1`} />
          <div className="flex-grow-1"><strong>{t.title} - </strong> {t.message}</div>
          <button type="button" className="btn-close ms-2 mt-1" onClick={() => onClose(t.id)} aria-label="Close" style={{ position: 'static' }} />
        </div>
      );
    })}
    <style>{`
      @keyframes slideIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
      .form-check-input { box-shadow: 0 0 8px rgba(92, 152, 225, 0.1); border-color: #d9d9d9; }
      .form-check-input:checked { box-shadow: 0 0 8px rgba(22, 119, 255, 0.2); }
      /* ── Mobile responsive ── */
      @media (max-width: 576px) {
        .pref-tab-bar { overflow-x: auto; flex-wrap: nowrap !important; gap: 12px !important; -webkit-overflow-scrolling: touch; }
        .pref-tab-bar button { white-space: nowrap; flex-shrink: 0; }
        .pref-form { max-width: 100% !important; }
        .pref-select-row { flex-direction: column !important; align-items: flex-start !important; gap: 6px; }
        .pref-select-row select { width: 100% !important; }
        .modal-dialog { margin: 8px !important; }
        .modal-content { max-height: 95vh; overflow-y: auto; }
        .pref-lock-card .card-body { padding: 12px !important; }
      }
      @media (max-width: 768px) {
        .pref-form { max-width: 100% !important; }
        .modal-dialog { max-width: calc(100vw - 24px) !important; min-width: unset !important; }
        .pref-check-row { flex-wrap: wrap; }
        .pref-check-label { width: 100%; margin-bottom: 4px; }
      }
          /* ── Mobile bottom sheet ── */
        .pl-mobile-sheet { position: fixed; inset: 0; z-index: 600; display: flex; flex-direction: column; justify-content: flex-end; }
        .pl-mobile-sheet-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
        .pl-mobile-sheet-body { position: relative; background: #fff; border-radius: 16px 16px 0 0; padding: 8px 0 24px; max-height: 70vh; overflow-y: auto; }
        .pl-mobile-sheet-handle { width: 36px; height: 4px; background: #d1d5db; border-radius: 2px; margin: 8px auto 16px; }
        .pl-mobile-sheet-item { padding: 12px 20px; font-size: 14px; color: #374151; display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .pl-mobile-sheet-item:hover { background: #f9fafb; }
        .pl-mobile-sheet-item.active { color: #e41f07; font-weight: 600; }
        
        /* ── Search input ── */
        .pl-search { border: 1px solid #e5e7eb; border-radius: 7px; padding: 7px 12px 7px 32px; font-size: 13px; outline: none; width: 100%; background: #f9fafb; }
        .pl-search:focus { border-color: #e41f07; background: #fff; }
        .pl-search-wrap { position: relative; width: 100%; }
        .pl-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 14px; pointer-events: none; }
        
        /* ── Empty state ── */
        .pl-empty { text-align: center; padding: 60px 20px; color: #9ca3af; }
        
        /* ── Responsive ── */
        @media (max-width: 640px) {
          .pl-header { padding: 0 12px; }
          .pl-toolbar { padding: 8px 12px; }
          .hide-mobile { display: none !important; }
          .pl-table th, .pl-table td { padding: 10px 10px; }
          .pl-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 12px; }
          .pl-split-list { width: 100% !important; }
        }
        @media (min-width: 641px) {
          .hide-desktop { display: none !important; }
          .pl-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
        }
        @media (max-width: 480px) {
          .pl-view-btn { font-size: 13px; }
          .btn-red span, .btn-outline span { display: none; }
          .btn-red, .btn-outline { padding: 7px 10px; }
        }
    `}</style>
  </div>
);

/* ═══════════════════════════════════════
   INTERFACES
═══════════════════════════════════════ */
interface CustomField {
  id: number;
  module: string;
  fieldName: string;
  displayName: string;
  dataType: string;
  defaultValue: string;
  mandatory: 'Yes' | 'No';
  showInAllPdfs: 'Yes' | 'No';
  status: 'Active' | 'Inactive';
  helpText: string;
  dataPii: boolean;
  preventDuplicates: 'Yes' | 'No';
  inputFormat: string;
}

interface LockConfig {
  id: number;
  name: string;
  description?: string;
  module: string;
  action_type: 'restrict_all' | 'restrict_selected' | 'allow_selected';
  selected_actions: string[];
  field_type: 'restrict_all' | 'restrict_selected' | 'allow_selected';
  selected_fields: string[];
  lock_for_type: 'all_roles' | 'all_roles_except' | 'selected_roles';
  roles: string[];
  status: 'active' | 'inactive';
}

interface GeneralPrefs {
  decimalRate: string; dimensionUnit: string; weightUnit: string; barcodeScanField: string;
  allowDuplicateNames: boolean; enableEnhancedSearch: boolean;
  enablePriceLists: boolean; applyPriceListAtLineItem: boolean;
  enableCompositeItems: boolean; inventoryStartDate: string;
  enableSerialTracking: boolean; serialMandatory: 'Yes' | 'No'; serialTrackedIn: string;
  enableBatchTracking: boolean; allowDuplicateBatchNumbers: boolean;
  restrictReturnsToBatch: boolean; allowDiffSellingPriceBatch: boolean;
  preventBelowZero: boolean; outOfStockWarning: boolean;
  notifyReorderPoint: boolean; notifyTo: string; trackLandedCost: boolean;
}

interface AddFieldForm {
  module: string;
  labelName: string;
  displayName: string;
  dataType: string;
  mandatory: 'Yes' | 'No';
  defaultValue: string;
  showInAllPdfs: 'Yes' | 'No';
  status: 'Active' | 'Inactive';
  helpText: string;
  dataPii: boolean;
  preventDuplicates: 'Yes' | 'No';
  inputFormat: string;
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const FieldError = ({ msg }: { msg: string }) => (
  <div className="text-danger mt-1" style={{ fontSize: '11px', fontWeight: 500 }}>{msg}</div>
);

const WarnBanner = ({ children }: { children: React.ReactNode }) => (
  <div className="alert alert-warning mb-3 mt-2" role="alert">
    <i className="ti ti-alert-triangle me-2" />{children}
  </div>
);

const InfoBanner = ({ children }: { children: React.ReactNode }) => (
  <div className="alert alert-info d-flex align-items-center mb-3 mt-2" role="alert">
    <i className="ti ti-info-circle f-12 me-2" /><div>{children}</div>
  </div>
);

const Section: React.FC<{ title: string; infoIcon?: boolean; infoText?: string }> = ({ title, infoIcon, infoText }) => (
  <div className="mt-4 mb-2" style={{ borderTop: '1px solid #e9ecef', paddingTop: '18px' }}>
    {title && (
      <h6 className="d-flex align-items-center gap-1 mb-0" style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a2e' }}>
        {title}
        {infoIcon && <span title={infoText || ''} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#1677ff', color: '#fff', fontSize: '10px', fontWeight: 700, cursor: 'help', flexShrink: 0 }}>i</span>}
      </h6>
    )}
  </div>
);

// ── SelectRow: mobile responsive ──────────────────────────────────────────────
const SelectRow: React.FC<{
  label: string; value: string;
  options: { value: string; label: string }[];
  infoIcon?: boolean; infoText?: string;
  onChange: (v: string) => void
}> = ({ label, value, options, infoIcon, infoText, onChange }) => (
  <div className="d-flex align-items-start align-items-sm-center justify-content-between py-3 pref-select-row flex-column flex-sm-row" style={{ borderBottom: '1px solid #f0f0f0', gap: 8 }}>
    <label className="d-flex align-items-center gap-1 mb-0" style={{ fontSize: '14px', color: '#2d2d2d' }}>
      {label}
      {infoIcon && <span title={infoText || ''} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#8c8c8c', color: '#fff', fontSize: '9px', fontWeight: 700, cursor: 'help' }}>i</span>}
    </label>
    <select className="form-select form-select-sm" value={value} onChange={e => onChange(e.target.value)} style={{ minWidth: 150, maxWidth: '100%', fontSize: '14px' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const fLb = { fontSize: '14px', color: '#595959', fontWeight: 500 };
const mOv: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' };
const mBx: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '8px', width: '100%', maxWidth: '850px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', maxHeight: '95vh' };
const mHd = { padding: '16px 20px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const mBd = { padding: '20px', overflowY: 'auto' as const };
const mFt = { padding: '14px 20px', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end', gap: '12px' };
const xBt = { background: 'none', border: 'none', outline: 'none', fontSize: '20px', color: '#8c8c8c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const getDefaultValueForType = (dt: string): string => {
  const map: Record<string, string> = {
    'Text Box (Single Line)': '', 'Text Box (Multi Line)': '',
    'Email': '', 'Phone': '', 'URL': 'https://', 'Image': '',
    'Decimal': '0.00', 'Integer': '0', 'Number': '0', 'Amount': '0.00', 'Percent': '0',
    'Dropdown': '', 'Multi-select': '', 'Checkbox': 'false',
    'Date': new Date().toISOString().split('T')[0],
    'Date Time': new Date().toISOString().slice(0, 16),
  };
  return map[dt] ?? '';
};

const DATA_TYPE_DEFAULTS: Record<string, { placeholder: string; inputType: string }> = {
  'Text Box (Single Line)': { placeholder: 'e.g. Default text', inputType: 'text' },
  'Text Box (Multi Line)': { placeholder: 'e.g. Default multi-line text', inputType: 'text' },
  'Email': { placeholder: 'e.g. user@example.com', inputType: 'email' },
  'Phone': { placeholder: 'e.g. +91 9876543210', inputType: 'tel' },
  'Decimal': { placeholder: 'e.g. 0.00', inputType: 'number' },
  'Integer': { placeholder: 'e.g. 0', inputType: 'number' },
  'Number': { placeholder: 'e.g. 0', inputType: 'number' },
  'Amount': { placeholder: 'e.g. 0.00', inputType: 'number' },
  'Percent': { placeholder: 'e.g. 0', inputType: 'number' },
  'Date': { placeholder: 'Select date', inputType: 'date' },
  'Date Time': { placeholder: 'Select date & time', inputType: 'datetime-local' },
  'Dropdown': { placeholder: 'e.g. Option1,Option2,Option3 (comma separated)', inputType: 'text' },
  'Multi-select': { placeholder: 'e.g. Choice 1,Choice 2 (comma separated)', inputType: 'text' },
  'Checkbox': { placeholder: '', inputType: 'checkbox' },
  'URL': { placeholder: 'e.g. https://example.com', inputType: 'url' },
  'Image': { placeholder: 'Image URL or leave empty', inputType: 'text' },
};

const FRONTEND_TO_BACKEND_TYPE: Record<string, string> = {
  'Text Box (Single Line)': 'Text Box (Single Line)',
  'Text Box (Multi Line)': 'Text Area (Multi Line)',
  'Email': 'Email', 'Phone': 'Phone', 'Decimal': 'Decimal', 'Integer': 'Integer',
  'Number': 'Number', 'Amount': 'Amount', 'Percent': 'Percent',
  'Date': 'Date', 'Date Time': 'Date and Time', 'Dropdown': 'Dropdown',
  'Multi-select': 'Multi-select', 'Checkbox': 'Boolean', 'URL': 'URL', 'Image': 'Image',
};

const INPUT_FORMAT_OPTIONS: { label: string; description: string }[] = [
  { label: 'Numbers', description: 'Accepts only numbers 0-9.' },
  { label: 'Alphanumeric Characters Without Spaces', description: 'Accepts lowercase, uppercase letters and numbers.' },
  { label: 'Alphanumeric Characters With Spaces', description: 'Accepts lowercase, uppercase letters, numbers and spaces.' },
  { label: 'Alphanumeric Characters With Hyphens and Underscores', description: 'Accepts letters, numbers, hyphens (-), and underscores (_).' },
  { label: 'Alphabets Without Spaces', description: 'Accepts only lowercase and uppercase letters.' },
  { label: 'Alphabets With Spaces', description: 'Accepts lowercase, uppercase letters and spaces.' },
];

const InputFormatSelect: React.FC<{ value: string; onChange: (v: string) => void; required?: boolean }> = ({ value, onChange, required }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = INPUT_FORMAT_OPTIONS.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.description.toLowerCase().includes(search.toLowerCase())
  );
  const selected = INPUT_FORMAT_OPTIONS.find(o => o.label === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => { setOpen(o => !o); setSearch(''); }}
        className={`form-select text-start d-flex align-items-center justify-content-between${required && !value ? ' border-danger' : ''}`}
        style={{ fontSize: '14px', color: value ? '#212529' : '#6c757d', cursor: 'pointer', backgroundColor: '#fff' }}>
        <span className="text-truncate">{value || 'Select Format'}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'} ms-2`} style={{ flexShrink: 0, fontSize: '12px' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1060, backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: '2px' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: '13px' }} />
              <input autoFocus type="text" className="form-control form-control-sm shadow-none" placeholder="Search" value={search}
                onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '30px', fontSize: '13px' }} onClick={e => e.stopPropagation()} />
            </div>
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div className="text-muted text-center py-3" style={{ fontSize: '13px' }}>No results</div>
            ) : filtered.map(opt => {
              const isActive = opt.label === value;
              return (
                <div key={opt.label} onClick={() => { onChange(opt.label); setOpen(false); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', backgroundColor: isActive ? '#1677ff' : 'transparent', color: isActive ? '#fff' : '#212529', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f5f5f5'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{opt.label}</div>
                  <div style={{ fontSize: '12px', color: isActive ? 'rgba(255,255,255,0.85)' : '#6c757d', lineHeight: '1.4' }}>{opt.description}</div>
                </div>
              );
            })}
          </div>
          {selected && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '11px', color: '#6c757d' }}>{selected.description}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BACKEND_TO_FRONTEND_TYPE: Record<string, string> = {
  'string': 'Text Box (Single Line)', 'text': 'Text Box (Multi Line)', 'longtext': 'Text Box (Multi Line)',
  'email': 'Email', 'phone': 'Phone', 'decimal': 'Decimal', 'float': 'Decimal', 'double': 'Decimal',
  'integer': 'Integer', 'biginteger': 'Integer', 'smallinteger': 'Integer', 'tinyinteger': 'Integer',
  'date': 'Date', 'datetime': 'Date Time', 'timestamp': 'Date Time',
  'boolean': 'Checkbox', 'array': 'Dropdown', 'url': 'URL', 'image': 'Image',
};

interface MultiSelectDropdownProps {
  label: string;
  options: { key: string; label: string }[];
  selected: string[];
  onChange: (keys: string[]) => void;
  placeholder?: string;
  error?: string;
}
const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, options, selected, onChange, placeholder = 'Select...', error }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };

  const displayText = selected.length === 0
    ? placeholder
    : selected.length <= 2
      ? selected.map(k => options.find(o => o.key === k)?.label ?? k).join(', ')
      : `${selected.length} selected`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`form-select text-start d-flex align-items-center justify-content-between${error ? ' is-invalid border-danger' : ''}`}
        style={{ fontSize: '14px', color: selected.length === 0 ? '#adb5bd' : '#212529', backgroundColor: '#fff', cursor: 'pointer' }}>
        <span className="text-truncate">{displayText}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'} ms-2`} style={{ flexShrink: 0, fontSize: '12px' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1060, backgroundColor: '#fff', border: '1px solid #dee2e6', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: '200px', overflowY: 'auto', marginTop: '2px' }}>
          {options.length === 0 ? (
            <div className="text-muted text-center py-3" style={{ fontSize: '13px' }}>No options available</div>
          ) : options.map(opt => (
            <label key={opt.key} className="d-flex align-items-center gap-2 px-3 py-2"
              style={{ cursor: 'pointer', fontSize: '14px', margin: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              <input type="checkbox" checked={selected.includes(opt.key)} onChange={() => toggle(opt.key)}
                style={{ width: '15px', height: '15px', accentColor: '#1677ff', flexShrink: 0, cursor: 'pointer' }} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
      {error && <div className="text-danger mt-1" style={{ fontSize: '11px', fontWeight: 500 }}>{error}</div>}
    </div>
  );
};

const DefaultValueInput: React.FC<{
  dataType: string; value: string; onChange: (v: string) => void; idPrefix: string; hasError?: boolean;
}> = ({ dataType, value, onChange, idPrefix, hasError }) => {
  if (dataType === 'Checkbox') {
    return (
      <div className="d-flex align-items-center gap-3">
        {(['true', 'false'] as const).map(v => (
          <div key={v} className="d-flex align-items-center gap-2">
            <input type="radio" id={`${idPrefix}-dv-${v}`} name={`${idPrefix}-default-checkbox`}
              checked={value === v} onChange={() => onChange(v)}
              style={{ width: '15px', height: '15px', accentColor: '#1677ff' }} />
            <label htmlFor={`${idPrefix}-dv-${v}`} style={{ fontSize: '14px', cursor: 'pointer', marginBottom: 0 }}>
              {v === 'true' ? 'Checked' : 'Unchecked'}
            </label>
          </div>
        ))}
      </div>
    );
  }
  if (dataType === 'Dropdown' || dataType === 'Multi-select') {
    return (
      <>
        <textarea className={`form-control shadow-none ${hasError ? 'is-invalid border-danger' : ''}`} rows={3} value={value} onChange={e => onChange(e.target.value)}
          placeholder={dataType === 'Dropdown' ? "Add options separated by commas" : "Add choices separated by commas"}
          style={{ border: '1px solid #79b3ff', borderRadius: '4px', fontSize: '14px' }} />
        <div className="text-muted mt-1" style={{ fontSize: '12px' }}>First choice is default.</div>
      </>
    );
  }
  const meta = DATA_TYPE_DEFAULTS[dataType] ?? { placeholder: 'Optional default value', inputType: 'text' };
  return (
    <input type={meta.inputType} className={`form-control shadow-none ${hasError ? 'is-invalid border-danger' : ''}`}
      value={value} onChange={e => onChange(e.target.value)} placeholder={meta.placeholder}
      step={(dataType === 'Decimal' || dataType === 'Amount') ? '0.01' : undefined}
      style={{ height: '36px', borderRadius: '4px', border: '1px solid #d9d9d9', fontSize: '14px' }} />
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const ProductPreference: React.FC = () => {

  const [activeTab, setActiveTab] = useState<'general' | 'field-customization' | 'record-locking'>('general');
  const [loading, setLoading] = useState(false);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockAvailableFields, setLockAvailableFields] = useState<Record<string, string>>({});
  const [lockAvailableRoles, setLockAvailableRoles] = useState<Record<string, string>>({});

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const closeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
  const showToast = useCallback((type: ToastItem['type'], title: string, message: string) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, title, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  }, []);

  const [fe, setFe] = useState<Partial<Record<keyof GeneralPrefs, string>>>({});
  const clearFe = (k: keyof GeneralPrefs) => setFe(p => { const n = { ...p }; delete n[k]; return n; });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configModalType, setConfigModalType] = useState<'serial' | 'batch'>('serial');

  const defaultPrefs: GeneralPrefs = {
    decimalRate: '2', dimensionUnit: 'cm', weightUnit: 'kg', barcodeScanField: 'SKU',
    allowDuplicateNames: false, enableEnhancedSearch: false,
    enablePriceLists: false, applyPriceListAtLineItem: false,
    enableCompositeItems: false, inventoryStartDate: '',
    enableSerialTracking: false, serialMandatory: 'Yes',
    serialTrackedIn: 'Packages, Purchase Receives & Return Receipts',
    enableBatchTracking: false, allowDuplicateBatchNumbers: false,
    restrictReturnsToBatch: false, allowDiffSellingPriceBatch: false,
    preventBelowZero: false, outOfStockWarning: false,
    notifyReorderPoint: false, notifyTo: '', trackLandedCost: false,
  };
  const [prefs, setPrefs] = useState<GeneralPrefs>(defaultPrefs);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [lockConfigs, setLockConfigs] = useState<LockConfig[]>([]);
  const [searchTextFields, setSearchTextFields] = useState<string>("");
  const [searchTextLocks, setSearchTextLocks] = useState<string>("");

  const loadPreferences = useCallback(async () => {
    try {
      const res = await api.get('/product-preferences');
      if (res.data.success && res.data.data) { setPrefs(res.data.data); setHasUnsavedChanges(false); }
    } catch (err) { console.error('Failed to load preferences:', err); }
  }, []);

  const loadCustomFields = useCallback(async () => {
    setFieldsLoading(true);
    try {
      const res = await api.get('/custom-fields');
      if (res.data.success) {
        const mapped = (res.data.data ?? []).map((f: any) => {
          const config = f.additional_config ?? {};
          const storedType = f.data_type ?? 'string';
          return {
            id: f.id, module: f.module ?? 'Products',
            fieldName: f.label_name ?? f.name ?? f.fieldName ?? '',
            displayName: f.display_name ?? f.fieldName ?? f.label_name ?? '',
            dataType: BACKEND_TO_FRONTEND_TYPE[storedType] ?? 'Text Box (Single Line)',
            defaultValue: config.default_value ?? f.default_value ?? f.defaultValue ?? '',
            mandatory: (f.mandatory === 'yes' || f.mandatory === 'Yes') ? 'Yes' : 'No',
            showInAllPdfs: (config.show_in_pdfs === true || config.show_in_pdfs === 'Yes') ? 'Yes' : 'No',
            status: (f.status === 'active' || f.status === 'Active') ? 'Active' : 'Inactive',
            helpText: f.help_text ?? '',
            dataPii: f.privacy_pii === true || f.privacy_pii === 1,
            preventDuplicates: (f.prevent_duplicates === 'yes' || f.prevent_duplicates === 'Yes') ? 'Yes' : 'No',
            inputFormat: f.input_format ?? '',
          } as CustomField;
        });
        setCustomFields(mapped);
      }
    } catch (err) { console.error('Failed to load custom fields:', err); }
    finally { setFieldsLoading(false); }
  }, []);

  const loadLockConfigs = useCallback(async () => {
    setLockLoading(true);
    try {
      const res = await api.get('/lock_configuration');
      const raw = Array.isArray(res.data) ? res.data : (res.data.data ?? []);
      setLockConfigs(raw);
    } catch (err) { console.error('Failed to load lock configurations:', err); }
    finally { setLockLoading(false); }
  }, []);

  const loadLockMeta = useCallback(async () => {
    try {
      const res = await api.get('/lock_configuration/meta');
      if (res.data.success) {
        setLockAvailableFields(res.data.availableFields ?? {});
        setLockAvailableRoles(res.data.availableRoles ?? {});
      }
    } catch (err) { console.error('Failed to load lock meta data:', err); }
  }, []);

  useEffect(() => { loadPreferences(); loadCustomFields(); loadLockConfigs(); loadLockMeta(); }, [loadPreferences, loadCustomFields, loadLockConfigs, loadLockMeta]);

  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [hasUnsavedChanges]);

  const setP = <K extends keyof GeneralPrefs>(key: K, val: GeneralPrefs[K]) => {
    clearFe(key); setHasUnsavedChanges(true);
    setPrefs(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'preventBelowZero' && val === true) next.outOfStockWarning = false;
      if (key === 'outOfStockWarning' && val === true) next.preventBelowZero = false;
      if (key === 'enableBatchTracking' && val === false) { next.allowDuplicateBatchNumbers = false; next.restrictReturnsToBatch = false; next.allowDiffSellingPriceBatch = false; }
      if (key === 'enablePriceLists' && val === false) next.applyPriceListAtLineItem = false;
      return next;
    });
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof GeneralPrefs, string>> = {};
    if (!prefs.inventoryStartDate.trim()) errors.inventoryStartDate = 'Inventory Start Date is required.';
    if (prefs.notifyReorderPoint) {
      if (!prefs.notifyTo.trim()) errors.notifyTo = 'Email address is required.';
      else if (!isValidEmail(prefs.notifyTo)) errors.notifyTo = 'Please enter a valid email.';
    }
    if (Object.keys(errors).length > 0) { setFe(errors); showToast('danger', 'Please fix the errors', Object.values(errors)[0] as string); return false; }
    setFe({}); return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await api.post('/product-preferences', prefs);
      if (res.data.success) {
        showToast('success', 'Saved Successfully', res.data.message || 'Product preferences have been saved.');
        await loadPreferences(); setHasUnsavedChanges(false);
      } else showToast('warning', 'Not Saved', res.data.message || 'Server rejected the request.');
    } catch (err: any) {
      const status = err?.response?.status; const msg = err?.response?.data?.message;
      if (status === 422) showToast('danger', 'Validation Failed', msg || 'Validation error');
      else if (status === 500) showToast('danger', 'Server Error', msg || 'Internal server error');
      else if (!err?.response) showToast('danger', 'Connection Error', 'Cannot reach server');
      else showToast('danger', 'Save Failed', msg || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const openConfigure = (type: 'serial' | 'batch') => { setConfigModalType(type); setShowConfigModal(true); };

  /* ══ ADD FIELD STATE ══ */
  const defaultAddForm: AddFieldForm = {
    module: 'Products', labelName: '', displayName: '', dataType: '',
    mandatory: 'No', defaultValue: '', showInAllPdfs: 'No', status: 'Active',
    helpText: '', dataPii: false, preventDuplicates: 'No', inputFormat: '',
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddFieldForm>(defaultAddForm);
  const [addErr, setAddErr] = useState<Record<string, string>>({});
  const [addSaving, setAddSaving] = useState(false);

  const openAddModal = useCallback(() => { setAddForm(defaultAddForm); setAddErr({}); setShowAddModal(true); }, []);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<CustomField>({
    id: 0, module: 'Products', fieldName: '', displayName: '', dataType: 'Text Box (Single Line)', defaultValue: '', mandatory: 'No', showInAllPdfs: 'No', status: 'Active',
    helpText: '', dataPii: false, preventDuplicates: 'No', inputFormat: '',
  });
  const [editErr, setEditErr] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const [showLockModal, setShowLockModal] = useState(false);
  const [lockSaving, setLockSaving] = useState(false);
  const [lockErr, setLockErr] = useState<Record<string, string>>({});
  const [showLockDeleteModal, setShowLockDeleteModal] = useState(false);
  const [lockDeleteId, setLockDeleteId] = useState<number | null>(null);
  const [lockDeleteName, setLockDeleteName] = useState('');

  const defaultLockForm = {
    name: '', description: '',
    action_type: 'restrict_all' as 'restrict_all' | 'restrict_selected' | 'allow_selected',
    selected_actions: [] as string[],
    field_type: 'restrict_all' as 'restrict_all' | 'restrict_selected' | 'allow_selected',
    selected_fields: [] as string[],
    lock_for_type: 'all_roles' as 'all_roles' | 'all_roles_except' | 'selected_roles',
    roles: [] as string[],
  };
  const [newLock, setNewLock] = useState(defaultLockForm);

  const handleFieldAction = async (fieldId: number, action: 'toggle_status' | 'toggle_mandatory' | 'toggle_pdf') => {
    setCustomFields(prev => prev.map(f => {
      if (f.id !== fieldId) return f;
      if (action === 'toggle_status') return { ...f, status: f.status === 'Active' ? 'Inactive' : 'Active' } as CustomField;
      if (action === 'toggle_mandatory') return { ...f, mandatory: f.mandatory === 'Yes' ? 'No' : 'Yes' } as CustomField;
      if (action === 'toggle_pdf') return { ...f, showInAllPdfs: f.showInAllPdfs === 'Yes' ? 'No' : 'Yes' } as CustomField;
      return f;
    }));
    try {
      const ep = action === 'toggle_status' ? `/field_customization/${fieldId}/toggle-status`
        : action === 'toggle_mandatory' ? `/field_customization/${fieldId}/toggle-mandatory`
          : `/field_customization/${fieldId}/toggle-pdf`;
      await api.patch(ep);
      showToast('success', 'Updated',
        action === 'toggle_status' ? 'Status changed' :
          action === 'toggle_mandatory' ? 'Mandatory updated' : 'PDF visibility changed');
    } catch (err: any) {
      showToast('danger', 'Update Failed', err?.response?.data?.message || 'Failed to update.');
      await loadCustomFields();
    }
  };

  const validateDefaultValue = (dataType: string, value: string): string => {
    if (!value || value.trim() === '') return '';
    switch (dataType) {
      case 'Email': if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Valid email required'; break;
      case 'Phone': if (!/^[+\d][\d\s\-().]{5,19}$/.test(value.trim())) return 'Valid phone required'; break;
      case 'URL': try { new URL(value.trim()); } catch { return 'Valid URL required (https://...)'; } break;
      case 'Decimal': if (isNaN(Number(value.trim()))) return 'Valid decimal required'; break;
      case 'Integer': if (!/^-?\d+$/.test(value.trim())) return 'Valid integer required'; break;
      case 'Date': if (isNaN(Date.parse(value))) return 'Valid date required'; break;
      case 'Date Time': if (isNaN(Date.parse(value))) return 'Valid date & time required'; break;
    }
    return '';
  };

  const handleSaveAdd = async () => {
    const errs: Record<string, string> = {};
    if (!addForm.displayName.trim()) errs.displayName = 'Display name is required.';
    if (!addForm.dataType) errs.dataType = 'Please select a data type.';
    const dvErr = validateDefaultValue(addForm.dataType, addForm.defaultValue);
    if (dvErr) errs.defaultValue = dvErr;
    if (Object.keys(errs).length > 0) { setAddErr(errs); return; }
    setAddErr({}); setAddSaving(true);
    try {
      const res = await api.post('/field_customization', {
        module: addForm.module, label_name: addForm.labelName, display_name: addForm.displayName.trim(),
        data_type: FRONTEND_TO_BACKEND_TYPE[addForm.dataType] ?? addForm.dataType,
        default_value: addForm.defaultValue || null,
        mandatory: addForm.mandatory === 'Yes' ? 'yes' : 'no',
        status: addForm.status === 'Active' ? 'active' : 'inactive',
        show_in_pdfs: addForm.showInAllPdfs === 'Yes',
        help_text: addForm.helpText || null, privacy_pii: addForm.dataPii,
        prevent_duplicates: addForm.preventDuplicates === 'Yes' ? 'yes' : 'no',
        input_format: addForm.inputFormat || null,
      });
      if (res.data.success) {
        showToast('success', 'Field Added', `"${addForm.displayName}" added successfully.`);
        setShowAddModal(false); setAddForm(defaultAddForm); await loadCustomFields();
      } else showToast('danger', 'Failed', res.data.message || 'Failed to add field.');
    } catch (err: any) {
      const errsBack = err?.response?.data?.errors;
      showToast('danger', 'Save Failed', errsBack ? Object.values(errsBack).flat().join(', ') : err?.response?.data?.message || 'Failed to save.');
    } finally { setAddSaving(false); }
  };

  const openEdit = (f: CustomField) => { setEditForm({ ...f, defaultValue: f.defaultValue ?? '' }); setEditErr(''); setShowEditModal(true); };

  const handleSaveEdit = async () => {
    if (!editForm.displayName.trim()) { setEditErr('Display name is required.'); return; }
    setEditErr(''); setEditSaving(true);
    try {
      const res = await api.put(`/field_customization/${editForm.id}`, {
        module: editForm.module, label_name: editForm.fieldName.trim(), display_name: editForm.displayName.trim(),
        data_type: FRONTEND_TO_BACKEND_TYPE[editForm.dataType] ?? editForm.dataType,
        default_value: editForm.defaultValue || null,
        mandatory: editForm.mandatory === 'Yes' ? 'yes' : 'no',
        status: editForm.status === 'Active' ? 'active' : 'inactive',
        show_in_pdfs: editForm.showInAllPdfs === 'Yes',
        help_text: editForm.helpText || null, privacy_pii: editForm.dataPii,
        prevent_duplicates: editForm.preventDuplicates === 'Yes' ? 'yes' : 'no',
        input_format: editForm.inputFormat || null,
      });
      if (res.data.success) {
        showToast('success', 'Field Updated', `"${editForm.displayName}" updated.`);
        setShowEditModal(false); await loadCustomFields();
      } else showToast('danger', 'Failed', res.data.message || 'Failed to update.');
    } catch (err: any) {
      const errs = err?.response?.data?.errors;
      showToast('danger', 'Update Failed', errs ? Object.values(errs).flat().join(', ') : err?.response?.data?.message || 'Failed.');
    } finally { setEditSaving(false); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/field_customization/${deleteId}`);
      showToast('danger', 'Field Deleted', `"${deleteName}" removed.`);
      setShowDeleteModal(false); setDeleteId(null); setDeleteName('');
      await loadCustomFields();
    } catch (err: any) {
      showToast('danger', 'Delete Failed', err?.response?.data?.message || 'Failed.');
    }
  };

  const handleSaveLock = async () => {
    const errs: Record<string, string> = {};
    if (!newLock.name.trim()) errs.name = 'Configuration name is required.';
    if (newLock.action_type !== 'restrict_all' && newLock.selected_actions.length === 0) errs.selected_actions = 'Please select at least one action.';
    if (newLock.field_type !== 'restrict_all' && newLock.selected_fields.length === 0) errs.selected_fields = 'Please select at least one field.';
    if (newLock.lock_for_type !== 'all_roles' && newLock.roles.length === 0) errs.roles = 'Please select at least one role.';
    if (Object.keys(errs).length > 0) { setLockErr(errs); return; }
    setLockErr({}); setLockSaving(true);
    try {
      await api.post('/lock_configuration', {
        name: newLock.name.trim(), description: newLock.description || null,
        action_type: newLock.action_type, selected_actions: newLock.selected_actions,
        field_type: newLock.field_type, selected_fields: newLock.selected_fields,
        lock_for_type: newLock.lock_for_type, roles: newLock.roles,
      });
      showToast('success', 'Lock Config Saved', `"${newLock.name}" created.`);
      setShowLockModal(false); setNewLock(defaultLockForm); await loadLockConfigs();
    } catch (err: any) {
      const bkErrs = err?.response?.data?.errors;
      showToast('danger', 'Save Failed', bkErrs ? Object.values(bkErrs).flat().join(', ') : err?.response?.data?.message || 'Failed.');
    } finally { setLockSaving(false); }
  };

  const handleToggleLockStatus = async (id: number) => {
    setLockConfigs(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c));
    try {
      await api.patch(`/lock_configuration/${id}/toggle`);
      showToast('success', 'Updated', 'Lock status changed.');
    } catch (err: any) {
      showToast('danger', 'Failed', err?.response?.data?.message || 'Failed.');
      await loadLockConfigs();
    }
  };

  const handleConfirmLockDelete = async () => {
    if (!lockDeleteId) return;
    try {
      await api.delete(`/lock_configuration/${lockDeleteId}`);
      showToast('danger', 'Deleted', `"${lockDeleteName}" removed.`);
      setShowLockDeleteModal(false); setLockDeleteId(null); setLockDeleteName('');
      await loadLockConfigs();
    } catch (err: any) {
      showToast('danger', 'Delete Failed', err?.response?.data?.message || 'Failed.');
    }
  };

  const fieldOptions = Object.entries(lockAvailableFields).map(([key, label]) => ({ key, label: label as string }));
  const roleOptions = Object.entries(lockAvailableRoles).map(([key, label]) => ({ key, label: label as string }));
  const actionOptions = [{ key: 'Edit', label: 'Edit' }, { key: 'Delete', label: 'Delete' }];

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <PageHeader title="Settings" badgeCount={false} showModuleTile={false} showExport={false} />
          <SettingsTopbar />

          {hasUnsavedChanges && (
            <div className="alert alert-warning mb-3" role="alert">
              <i className="ti ti-alert-triangle me-2" />
              You have unsaved changes.
            </div>
          )}

          <div className="row">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                {/* Tab bar — scrollable on mobile */}
                <div className="card-header bg-white border-bottom pt-3 pb-0 px-3 px-md-4">
                  <div className="d-flex align-items-center gap-3 pref-tab-bar" style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                    {(['general', 'field-customization', 'record-locking'] as const).map(tab => {
                      const labels: Record<string, string> = { general: 'General', 'field-customization': 'Field Customization', 'record-locking': 'Record Locking' };
                      return (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                          className={`btn btn-sm fw-bold border-0 p-0 position-relative ${activeTab === tab ? 'text-primary' : 'text-muted'}`}
                          style={{ fontSize: '14px', color: activeTab === tab ? '#e41f07' : '#6b7280', whiteSpace: 'nowrap', flexShrink: 0, paddingBottom: '4px !important' }}>
                          {labels[tab]}
                          {activeTab === tab && <div className="position-absolute start-0 end-0 bottom-0" style={{ height: '2px', backgroundColor: '#e41f07', marginBottom: '-10px' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tab header with action button */}
                <div className="card-header bg-white border-0 pt-3 pb-0 px-3 px-md-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <h5 className="fw-bold mb-0" style={{ fontSize: '16px', color: '#1a1a2e' }}>
                    {activeTab === 'general' && 'General'}
                    {activeTab === 'field-customization' && 'Field Customization'}
                    {activeTab === 'record-locking' && 'Record Locking'}
                  </h5>
                  {activeTab === 'field-customization' && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
                      <i className="ti ti-square-rounded-plus-filled me-1" />Add New Field
                    </button>
                  )}
                  {activeTab === 'record-locking' && lockConfigs.length > 0 && (
                    <button type="button" className="btn btn-primary btn-sm"
                      onClick={() => { setLockErr({}); setNewLock(defaultLockForm); setShowLockModal(true); }}>
                      <i className="ti ti-plus me-1" />New Lock
                    </button>
                  )}
                </div>

                <div className="card-body px-3 px-md-4 py-3 py-md-4">

                  {/* ══ TAB 1 — GENERAL ══ */}
                  {activeTab === 'general' && (
                    <form onSubmit={handleSave} className="pref-form" style={{ maxWidth: '820px' }}>
                      <SelectRow label="Set a decimal rate for your item quantity" value={prefs.decimalRate} onChange={v => setP('decimalRate', v)} options={['0', '1', '2', '3', '4', '5', '6'].map(n => ({ value: n, label: n }))} />
                      <SelectRow label="Measure item dimensions in:" value={prefs.dimensionUnit} onChange={v => setP('dimensionUnit', v)} options={['cm', 'm', 'mm', 'in', 'ft'].map(u => ({ value: u, label: u }))} />
                      <SelectRow label="Measure item weights in:" value={prefs.weightUnit} onChange={v => setP('weightUnit', v)} options={['kg', 'g', 'lb', 'oz'].map(u => ({ value: u, label: u }))} />
                      <SelectRow label="Select items when barcodes are scanned using:" value={prefs.barcodeScanField} onChange={v => setP('barcodeScanField', v)} options={['SKU', 'UPC', 'EAN', 'ISBN'].map(f => ({ value: f, label: f }))} infoIcon infoText="Choose which field identifies items when a barcode is scanned." />

                      <Section title="Duplicate Item Name" />
                      <WarnBanner>Before you enable this option, make the SKU field active and mandatory.</WarnBanner>
                      <div className="d-flex align-items-start align-items-sm-center justify-content-between ps-0 mb-3 mt-2 flex-column flex-sm-row pref-check-row" style={{ gap: 8 }}>
                        <div className="me-3">
                          <label className="form-check-label text-dark fw-medium" htmlFor="allowDuplicateNames">Allow duplicate item names</label>
                          <p className="text-muted mb-0" style={{ fontSize: '13px' }}>If enabled, all imports will use SKU as the primary field for mapping.</p>
                        </div>
                        <input className="form-check-input flex-shrink-0" type="checkbox" id="allowDuplicateNames" checked={prefs.allowDuplicateNames} onChange={e => setP('allowDuplicateNames', e.target.checked)} />
                      </div>

                      <Section title="Enhanced Item Search" />
                      <div className="d-flex align-items-center justify-content-between ps-0 mb-1">
                        <label className="form-check-label text-dark fw-medium" htmlFor="enableEnhancedSearch">Enable Enhanced Item Search</label>
                        <input className="form-check-input" type="checkbox" id="enableEnhancedSearch" checked={prefs.enableEnhancedSearch} onChange={e => setP('enableEnhancedSearch', e.target.checked)} />
                      </div>
                      <InfoBanner>Enabling this makes it easier to find items using keywords in any order.</InfoBanner>

                      <Section title="Price Lists" infoIcon infoText="Price Lists let you set different rates for different customers." />
                      <div className="d-flex align-items-start align-items-sm-center justify-content-between ps-0 mb-1 flex-column flex-sm-row" style={{ gap: 8 }}>
                        <div className="me-3">
                          <label className="form-check-label text-dark fw-medium" htmlFor="enablePriceLists">Enable Price Lists</label>
                          <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Customise item rates in sales and purchase transactions.</p>
                        </div>
                        <input className="form-check-input flex-shrink-0" type="checkbox" id="enablePriceLists" checked={prefs.enablePriceLists} onChange={e => setP('enablePriceLists', e.target.checked)} />
                      </div>
                      {prefs.enablePriceLists && (
                        <div className="d-flex align-items-start align-items-sm-center justify-content-between ps-0 mb-3 flex-column flex-sm-row" style={{ marginLeft: '24px', gap: 8 }}>
                          <div className="me-3">
                            <label className="form-check-label text-dark fw-medium" htmlFor="applyPriceListAtLineItem">Apply price list at line item level</label>
                            <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Apply different price lists for each line item.</p>
                          </div>
                          <input className="form-check-input flex-shrink-0" type="checkbox" id="applyPriceListAtLineItem" checked={prefs.applyPriceListAtLineItem} onChange={e => setP('applyPriceListAtLineItem', e.target.checked)} />
                        </div>
                      )}

                      <Section title="Composite Items" />
                      <div className="d-flex align-items-start align-items-sm-center justify-content-between ps-0 mb-1 flex-column flex-sm-row" style={{ gap: 8 }}>
                        <div className="me-3">
                          <label className="form-check-label text-dark fw-medium" htmlFor="enableCompositeItems">Enable Composite Items</label>
                          <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Combine items/services into a single product.</p>
                        </div>
                        <input className="form-check-input flex-shrink-0" type="checkbox" id="enableCompositeItems" checked={prefs.enableCompositeItems} onChange={e => setP('enableCompositeItems', e.target.checked)} />
                      </div>
                      {prefs.enableCompositeItems && <WarnBanner>Once composite items are created, you cannot disable this option.</WarnBanner>}

                      <Section title="" />
                      <div className="mb-3 mt-1">
                        <label className="d-flex align-items-center gap-1 mb-2" style={{ fontSize: '14px', fontWeight: 500, color: '#cf1322' }}>
                          Inventory Start Date <span style={{ color: '#dc3545' }}>*</span>
                        </label>
                        <input type="date" className={`form-control ${fe.inventoryStartDate ? 'is-invalid' : prefs.inventoryStartDate ? 'is-valid' : ''}`}
                          value={prefs.inventoryStartDate} onChange={e => setP('inventoryStartDate', e.target.value)}
                          style={{ width: '100%', maxWidth: '220px', fontSize: '14px' }} />
                        {fe.inventoryStartDate && <FieldError msg={fe.inventoryStartDate} />}
                      </div>

                      <Section title="Advanced Inventory Tracking" />
                      <div className="d-flex align-items-center justify-content-between ps-0 mb-2">
                        <label className="form-check-label text-dark fw-medium" htmlFor="enableSerialTracking">Enable Serial Number Tracking</label>
                        <input className="form-check-input" type="checkbox" id="enableSerialTracking" checked={prefs.enableSerialTracking} onChange={e => setP('enableSerialTracking', e.target.checked)} />
                      </div>
                      {prefs.enableSerialTracking && (
                        <div className="mb-3 p-3 rounded" style={{ marginLeft: '16px', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', fontSize: '13px' }}>
                          <div className="mb-2"><span className="text-muted fw-medium">Tracked in: </span><span className="text-dark">{prefs.serialTrackedIn}</span></div>
                          <div className="mb-2"><span className="text-muted fw-medium">Mandatory? </span><span className="text-dark">{prefs.serialMandatory}</span></div>
                          <button type="button" className="btn btn-sm btn-outline-primary mt-1" onClick={() => openConfigure('serial')}>Configure</button>
                        </div>
                      )}
                      <div className="d-flex align-items-center justify-content-between ps-0 mb-2">
                        <label className="form-check-label text-dark fw-medium" htmlFor="enableBatchTracking">Enable Batch Tracking</label>
                        <input className="form-check-input" type="checkbox" id="enableBatchTracking" checked={prefs.enableBatchTracking} onChange={e => setP('enableBatchTracking', e.target.checked)} />
                      </div>
                      {prefs.enableBatchTracking && (
                        <div className="mb-3 p-3 rounded" style={{ marginLeft: '16px', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                          {[
                            { id: 'b1', k: 'allowDuplicateBatchNumbers' as keyof GeneralPrefs, lbl: 'Allow duplicate batch numbers' },
                            { id: 'b2', k: 'restrictReturnsToBatch' as keyof GeneralPrefs, lbl: 'Allow quantity to be added only to the sold batch when returned' },
                            { id: 'b3', k: 'allowDiffSellingPriceBatch' as keyof GeneralPrefs, lbl: 'Allow different Selling price for each Batch' },
                          ].map(x => (
                            <div key={x.id} className="d-flex align-items-start align-items-sm-center justify-content-between ps-0 mb-2 flex-column flex-sm-row" style={{ gap: 6 }}>
                              <label className="form-check-label text-dark" htmlFor={x.id} style={{ fontSize: '13px' }}>{x.lbl}</label>
                              <input className="form-check-input flex-shrink-0" type="checkbox" id={x.id} checked={prefs[x.k] as boolean} onChange={e => setP(x.k, e.target.checked)} />
                            </div>
                          ))}
                          <button type="button" className="btn btn-sm btn-outline-primary mt-1" onClick={() => openConfigure('batch')}>Configure</button>
                        </div>
                      )}

                      <div className="d-flex align-items-start align-items-sm-center justify-content-between ps-0 mb-2 flex-column flex-sm-row" style={{ gap: 8 }}>
                        <label className="form-check-label text-dark fw-medium" htmlFor="preventBelowZero">Prevent stock from going below zero</label>
                        <input className="form-check-input flex-shrink-0" type="checkbox" id="preventBelowZero" checked={prefs.preventBelowZero} onChange={e => setP('preventBelowZero', e.target.checked)} />
                      </div>
                      {prefs.preventBelowZero && <WarnBanner>Transactions will be blocked if stock is insufficient.</WarnBanner>}

                      <div className="d-flex align-items-start align-items-sm-center justify-content-between ps-0 mb-2 flex-column flex-sm-row" style={{ gap: 8, opacity: prefs.preventBelowZero ? 0.45 : 1 }}>
                        <label className="form-check-label text-dark fw-medium" htmlFor={prefs.preventBelowZero ? undefined : 'outOfStockWarning'} style={{ cursor: prefs.preventBelowZero ? 'not-allowed' : 'pointer' }}>
                          Show Out of Stock warning when stock drops below zero
                        </label>
                        <input className="form-check-input flex-shrink-0" type="checkbox" id="outOfStockWarning" checked={prefs.outOfStockWarning} disabled={prefs.preventBelowZero} onChange={e => setP('outOfStockWarning', e.target.checked)} />
                      </div>

                      <div className="d-flex align-items-center justify-content-between ps-0 mb-2">
                        <label className="form-check-label text-dark fw-medium" htmlFor="notifyReorderPoint">Notify me if quantity reaches reorder point</label>
                        <input className="form-check-input" type="checkbox" id="notifyReorderPoint" checked={prefs.notifyReorderPoint} onChange={e => setP('notifyReorderPoint', e.target.checked)} />
                      </div>
                      {prefs.notifyReorderPoint && (
                        <div className="mb-2" style={{ marginLeft: '16px' }}>
                          <label style={{ fontSize: '13px', color: '#595959', marginBottom: '4px', display: 'block' }}>Notify to <span style={{ color: '#dc3545' }}>*</span></label>
                          <input type="text" className={`form-control form-control-sm ${fe.notifyTo ? 'is-invalid' : prefs.notifyTo && isValidEmail(prefs.notifyTo) ? 'is-valid' : ''}`}
                            placeholder="Enter email address" value={prefs.notifyTo} onChange={e => setP('notifyTo', e.target.value)}
                            style={{ width: '100%', maxWidth: '320px', fontSize: '13px' }} />
                          {prefs.notifyTo && !isValidEmail(prefs.notifyTo) && !fe.notifyTo && <FieldError msg="Enter a valid email" />}
                          {fe.notifyTo && <FieldError msg={fe.notifyTo} />}
                        </div>
                      )}

                      <div className="d-flex align-items-center justify-content-between ps-0 mb-2">
                        <label className="form-check-label text-dark fw-medium" htmlFor="trackLandedCost">Track landed cost on items</label>
                        <input className="form-check-input" type="checkbox" id="trackLandedCost" checked={prefs.trackLandedCost} onChange={e => setP('trackLandedCost', e.target.checked)} />
                      </div>

                      <div className="mt-4 pt-3 border-top">
                        <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                          {loading ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'Save'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ══ TAB 2 — FIELD CUSTOMIZATION ══ */}
                  {activeTab === 'field-customization' && (
                    <div>
                      {fieldsLoading ? (
                        <div className="text-center py-5"><span className="spinner-border spinner-border-sm me-2" /></div>
                      ) : customFields.length === 0 ? (
                        <div className="text-center py-5" style={{ color: '#8c8c8c', fontSize: '14px' }}>
                          <i className="ti ti-database-off" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }} />
                          No custom fields yet. Click "Add New Field" to add one.
                        </div>
                      ) : (
                        <>
                          <div className="mb-3" style={{ maxWidth: 280 }}>
                            <SearchInput value={searchTextFields} onChange={setSearchTextFields} />
                          </div>
                          <div className="table-responsive">
                            <table className="table table-nowrap mb-0" style={{ minWidth: 500 }}>
                              <thead className="table-light">
                                <tr>
                                  <th>Name</th>
                                  <th>Type</th>
                                  <th className="d-none d-md-table-cell">Default Value</th>
                                  <th>Mandatory</th>
                                  <th>Status</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customFields
                                  .filter(f => searchTextFields
                                    ? f.fieldName.toLowerCase().includes(searchTextFields.toLowerCase()) ||
                                    f.dataType.toLowerCase().includes(searchTextFields.toLowerCase())
                                    : true)
                                  .map((record, index) => (
                                    <tr key={index}>
                                      <td style={{ fontSize: 13 }}>{record.fieldName}</td>
                                      <td style={{ fontSize: 13 }}>{record.dataType}</td>
                                      <td className="d-none d-md-table-cell" style={{ fontSize: 13 }}>{record.defaultValue || '-'}</td>
                                      <td>
                                        <div className="form-check form-switch p-0">
                                          <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                                            checked={record.mandatory === 'Yes'} onChange={() => handleFieldAction(record.id, 'toggle_mandatory')} />
                                        </div>
                                      </td>
                                      <td>
                                        <span className={`badge badge-tag ${record.status === 'Active' ? 'badge-soft-success' : 'badge-soft-danger'}`}>
                                          {record.status === 'Active' ? 'Active' : 'Inactive'}
                                        </span>
                                      </td>
                                      <td>
                                        <div className="dropdown table-action">
                                          <Link to="#" className="action-icon btn btn-xs shadow d-inline-flex btn-outline-light" data-bs-toggle="dropdown">
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <div className="dropdown-menu dropdown-menu-right">
                                            <Link className="dropdown-item d-flex align-items-center" to="#" onClick={() => openEdit(record)}>
                                              <i className="ti ti-edit me-1" /> Edit
                                            </Link>
                                            <Link className="dropdown-item d-flex align-items-center" to="#" onClick={() => handleFieldAction(record.id, 'toggle_status')}>
                                              <i className={record.status === 'Active' ? 'ti ti-circle-x me-1' : 'ti ti-circle-check me-1'} />
                                              {record.status === 'Active' ? 'Deactivate' : 'Activate'}
                                            </Link>
                                            <Link className="dropdown-item d-flex align-items-center" to="#"
                                              onClick={() => { setDeleteId(record.id); setDeleteName(record.fieldName); setShowDeleteModal(true); }}>
                                              <i className="ti ti-trash me-1" /> Delete
                                            </Link>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ══ TAB 3 — RECORD LOCKING ══ */}
                  {activeTab === 'record-locking' && (
                    <div>
                      {lockLoading ? (
                        <div className="text-center py-5"><span className="spinner-border spinner-border-sm me-2" /></div>
                      ) : lockConfigs.length === 0 ? (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5">
                          <div className="d-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px', borderRadius: '16px', backgroundColor: '#f0f4ff' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" fill="#c7d7f7" stroke="#5b8dee" strokeWidth="1.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#5b8dee" strokeWidth="1.5" strokeLinecap="round" /><circle cx="12" cy="16" r="1.5" fill="#5b8dee" /></svg>
                          </div>
                          <h5 className="fw-semibold mb-2">Record Locking</h5>
                          <p className="text-center text-muted mb-4" style={{ fontSize: '14px', maxWidth: '400px', lineHeight: 1.6 }}>Specify which actions to allow or restrict after records are locked.</p>
                          <button type="button" className="btn btn-primary"
                            onClick={() => { setLockErr({}); setNewLock(defaultLockForm); setShowLockModal(true); }}>
                            <i className="ti ti-plus me-1" />New Lock Configuration
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="mb-3" style={{ maxWidth: 280 }}>
                            <SearchInput value={searchTextLocks} onChange={setSearchTextLocks} />
                          </div>
                          <div className="table-responsive">
                            <table className="table table-nowrap mb-0" style={{ minWidth: 500 }}>
                              <thead className="table-light">
                                <tr>
                                  <th>Name</th>
                                  <th className="d-none d-sm-table-cell">Actions</th>
                                  <th className="d-none d-md-table-cell">Fields</th>
                                  <th className="d-none d-sm-table-cell">Locked For</th>
                                  <th>Status</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lockConfigs
                                  .filter(rc => searchTextLocks ? rc.name.toLowerCase().includes(searchTextLocks.toLowerCase()) : true)
                                  .map((record, index) => (
                                    <tr key={index}>
                                      <td>
                                        <div className="text-dark fw-medium" style={{ fontSize: 13 }}>{record.name}</div>
                                        {record.description && <div className="text-muted" style={{ fontSize: '12px' }}>{record.description}</div>}
                                      </td>
                                      <td className="d-none d-sm-table-cell" style={{ fontSize: 13 }}>
                                        {record.action_type === 'restrict_all' ? 'Restrict All'
                                          : record.action_type === 'restrict_selected' ? `Restrict: ${record.selected_actions.join(', ')}`
                                            : `Allow: ${record.selected_actions.join(', ')}`}
                                      </td>
                                      <td className="d-none d-md-table-cell" style={{ fontSize: 13 }}>
                                        {record.field_type === 'restrict_all' ? 'All Fields' : `${record.selected_fields.length} field(s)`}
                                      </td>
                                      <td className="d-none d-sm-table-cell" style={{ fontSize: 13 }}>
                                        {record.lock_for_type === 'all_roles' ? 'All Users'
                                          : `${record.roles.map(r => lockAvailableRoles[r] ?? r).join(', ')}`}
                                      </td>
                                      <td>
                                        <span className={`badge badge-tag ${record.status === 'active' ? 'badge-soft-success' : 'badge-soft-danger'}`} style={{ textTransform: 'capitalize' }}>
                                          {record.status}
                                        </span>
                                      </td>
                                      <td>
                                        <div className="dropdown table-action">
                                          <Link to="#" className="action-icon btn btn-xs shadow d-inline-flex btn-outline-light" data-bs-toggle="dropdown">
                                            <i className="ti ti-dots-vertical" />
                                          </Link>
                                          <div className="dropdown-menu dropdown-menu-right">
                                            <Link className="dropdown-item d-flex align-items-center" to="#" onClick={() => handleToggleLockStatus(record.id)}>
                                              <i className={record.status === 'active' ? 'ti ti-circle-x me-1' : 'ti ti-circle-check me-1'} />
                                              {record.status === 'active' ? 'Deactivate' : 'Activate'}
                                            </Link>
                                            <Link className="dropdown-item d-flex align-items-center" to="#"
                                              onClick={() => { setLockDeleteId(record.id); setLockDeleteName(record.name); setShowLockDeleteModal(true); }}>
                                              <i className="ti ti-trash me-1" /> Delete
                                            </Link>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>

      {/* ══ MODAL — CONFIGURE (Serial / Batch) ══ */}
      {showConfigModal && (
        <div style={mOv} onClick={() => setShowConfigModal(false)}>
          <div style={mBx} onClick={e => e.stopPropagation()}>
            <div style={mHd}>
              <h5 className="modal-title" style={{ fontSize: 15 }}>Configure {configModalType === 'serial' ? 'Serial Number' : 'Batch'} Tracking</h5>
              <button style={xBt} onClick={() => setShowConfigModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div style={mBd}>
              {configModalType === 'serial' ? (
                <>
                  <div className="mb-4">
                    <label style={fLb}>Tracked in</label>
                    <div className="d-flex flex-column gap-2 mt-2">
                      {['Packages, Purchase Receives & Return Receipts', 'Purchase Receives & Return Receipts only', 'Packages only'].map(opt => (
                        <div key={opt} className="d-flex align-items-center gap-2">
                          <input type="radio" id={`st-${opt}`} name="serialTrackedIn" checked={prefs.serialTrackedIn === opt} onChange={() => setP('serialTrackedIn', opt)} style={{ width: '15px', height: '15px', accentColor: '#1677ff' }} />
                          <label htmlFor={`st-${opt}`} style={{ fontSize: '14px', cursor: 'pointer', marginBottom: 0 }}>{opt}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label style={fLb}>Mandatory?</label>
                    <div className="d-flex gap-3 mt-2">
                      {(['Yes', 'No'] as const).map(v => (
                        <div key={v} className="d-flex align-items-center gap-1">
                          <input type="radio" id={`sm-${v}`} name="serialMandatory" checked={prefs.serialMandatory === v} onChange={() => setP('serialMandatory', v)} style={{ width: '15px', height: '15px', accentColor: '#1677ff' }} />
                          <label htmlFor={`sm-${v}`} style={{ fontSize: '14px', cursor: 'pointer', marginBottom: 0 }}>{v}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mb-3">
                  <label style={fLb}>Batch Tracking Options</label>
                  <div className="d-flex flex-column gap-3 mt-2">
                    {[
                      { id: 'cfg-dup', k: 'allowDuplicateBatchNumbers' as keyof GeneralPrefs, lbl: 'Allow duplicate batch numbers' },
                      { id: 'cfg-ret', k: 'restrictReturnsToBatch' as keyof GeneralPrefs, lbl: 'Allow quantity added only to sold batch when returned' },
                      { id: 'cfg-price', k: 'allowDiffSellingPriceBatch' as keyof GeneralPrefs, lbl: 'Allow different Selling price per batch' },
                    ].map(x => (
                      <div key={x.id} className="d-flex align-items-center justify-content-between ps-0">
                        <label className="form-check-label text-dark fw-medium" htmlFor={x.id}>{x.lbl}</label>
                        <input className="form-check-input" type="checkbox" id={x.id} checked={prefs[x.k] as boolean} onChange={e => setP(x.k, e.target.checked)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={mFt}>
              <button className="btn btn-sm btn-light" onClick={() => setShowConfigModal(false)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={() => setShowConfigModal(false)}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL — ADD NEW CUSTOM FIELD ══ */}
      <div className={`modal fade ${showAddModal ? 'show d-block' : ''}`} role="dialog" style={{ backgroundColor: showAddModal ? 'rgba(0,0,0,0.5)' : 'transparent' }}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header py-3">
              <h5 className="modal-title" style={{ fontSize: 15 }}>Add New Field</h5>
              <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle"
                onClick={() => { if (!addSaving) { setShowAddModal(false); setAddForm(defaultAddForm); setAddErr({}); } }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Display Name <span className="text-danger">*</span></label>
                <input type="text" className={`form-control ${addErr.displayName ? 'is-invalid' : ''}`} value={addForm.displayName}
                  onChange={e => {
                    const val = e.target.value;
                    const slug = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                    setAddForm(p => ({ ...p, displayName: val, labelName: slug }));
                    setAddErr(p => ({ ...p, displayName: '' }));
                  }} autoFocus />
                {addErr.displayName && <FieldError msg={addErr.displayName} />}
              </div>
              <div className="mb-3">
                <label className="form-label text-muted">Label Name</label>
                <input type="text" className="form-control bg-light" value={addForm.labelName} readOnly style={{ pointerEvents: 'none' }} />
              </div>
              <div className="mb-3">
                <label className="form-label">Data Type <span className="text-danger">*</span></label>
                <CommonSelect options={Input_Type} className="select"
                  defaultValue={Input_Type.find(it => it.value === addForm.dataType) || Input_Type[0]}
                  onChange={(val) => { setAddErr(p => ({ ...p, dataType: '' })); setAddForm(p => ({ ...p, dataType: val, defaultValue: getDefaultValueForType(val) })); }} />
                {addErr.dataType && <FieldError msg={addErr.dataType} />}
              </div>
              <div className="mb-3">
                <label className="form-label">Help Text</label>
                <input type="text" className="form-control" value={addForm.helpText || ''} placeholder="Help users understand this field."
                  onChange={e => setAddForm(p => ({ ...p, helpText: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label">Data Privacy</label>
                <div className="d-flex align-items-center gap-2">
                  <input type="checkbox" id="add-pii" className="form-check-input me-1 mt-0" checked={addForm.dataPii}
                    onChange={() => setAddForm(p => ({ ...p, dataPii: !p.dataPii }))} style={{ width: '16px', height: '16px', cursor: 'pointer', float: 'none' }} />
                  <label htmlFor="add-pii" style={{ cursor: 'pointer', fontSize: 14, marginBottom: 0 }}>PII</label>
                </div>
                {addForm.dataPii && <WarnBanner>Data will be stored without encryption.</WarnBanner>}
              </div>
              <div className="mb-3">
                <label className="form-label d-block">Prevent Duplicate Values</label>
                <div className="d-flex align-items-center gap-4">
                  {(['Yes', 'No'] as const).map(v => (
                    <div key={v} className="d-flex align-items-center gap-2">
                      <input type="radio" id={`add-dup-${v}`} name="add_dup" checked={addForm.preventDuplicates === v}
                        onChange={() => setAddForm(p => ({ ...p, preventDuplicates: v }))}
                        style={{ accentColor: '#1677ff', width: '16px', height: '16px', cursor: 'pointer', float: 'none' }} />
                      <label htmlFor={`add-dup-${v}`} style={{ cursor: 'pointer', marginBottom: 0, fontSize: 14 }}>{v}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Input Format</label>
                <InputFormatSelect value={addForm.inputFormat || ''} onChange={v => setAddForm(p => ({ ...p, inputFormat: v }))} />
              </div>
              <div className="mb-3">
                <label className="form-label">Default Value</label>
                <DefaultValueInput dataType={addForm.dataType} value={addForm.defaultValue}
                  onChange={v => setAddForm(p => ({ ...p, defaultValue: v }))} idPrefix="add" hasError={!!addErr.defaultValue} />
                {addErr.defaultValue && <FieldError msg={addErr.defaultValue} />}
              </div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <label className="form-label mb-0">Mandatory</label>
                <div className="form-check form-switch mb-0">
                  <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                    checked={addForm.mandatory === 'Yes'} onChange={e => setAddForm(p => ({ ...p, mandatory: e.target.checked ? 'Yes' : 'No' }))} />
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <label className="form-label mb-0">Show in all PDFs</label>
                <div className="form-check form-switch mb-0">
                  <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                    checked={addForm.showInAllPdfs === 'Yes'} onChange={e => setAddForm(p => ({ ...p, showInAllPdfs: e.target.checked ? 'Yes' : 'No' }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer py-2">
              <button type="button" className="btn btn-sm btn-light me-2"
                onClick={() => { setShowAddModal(false); setAddForm(defaultAddForm); setAddErr({}); }}>Cancel</button>
              <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveAdd} disabled={addSaving}>
                {addSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MODAL — EDIT CUSTOM FIELD ══ */}
      <div className={`modal fade ${showEditModal ? 'show d-block' : ''}`} role="dialog" style={{ backgroundColor: showEditModal ? 'rgba(0,0,0,0.5)' : 'transparent' }}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header py-3">
              <h5 className="modal-title" style={{ fontSize: 15 }}>Edit Custom Field</h5>
              <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle" onClick={() => setShowEditModal(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Display Name <span className="text-danger">*</span></label>
                <input type="text" className={`form-control ${editErr ? 'is-invalid' : ''}`} value={editForm.displayName}
                  onChange={e => { const val = e.target.value; const slug = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''); setEditForm(p => ({ ...p, displayName: val, fieldName: slug })); setEditErr(''); }} required />
                {editErr && <FieldError msg={editErr} />}
              </div>
              <div className="mb-3">
                <label className="form-label text-muted">Label Name</label>
                <input type="text" className="form-control bg-light" value={editForm.fieldName} readOnly style={{ pointerEvents: 'none' }} />
              </div>
              <div className="mb-3">
                <label className="form-label">Data Type</label>
                <input type="text" className="form-control bg-light" value={editForm.dataType} readOnly style={{ pointerEvents: 'none' }} />
              </div>
              <div className="mb-3">
                <label className="form-label">Help Text</label>
                <input type="text" className="form-control" value={editForm.helpText || ''} placeholder="Help users understand this field."
                  onChange={e => setEditForm(p => ({ ...p, helpText: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label">Data Privacy</label>
                <div className="d-flex align-items-center gap-2">
                  <input type="checkbox" id="edit-pii" className="form-check-input me-1 mt-0" checked={editForm.dataPii}
                    onChange={() => setEditForm(p => ({ ...p, dataPii: !p.dataPii }))} style={{ width: '16px', height: '16px', cursor: 'pointer', float: 'none' }} />
                  <label htmlFor="edit-pii" style={{ cursor: 'pointer', fontSize: 14, marginBottom: 0 }}>PII</label>
                </div>
                {editForm.dataPii && <WarnBanner>Data will be stored without encryption.</WarnBanner>}
              </div>
              <div className="mb-3">
                <label className="form-label d-block">Prevent Duplicate Values</label>
                <div className="d-flex align-items-center gap-4">
                  {(['Yes', 'No'] as const).map(v => (
                    <div key={v} className="d-flex align-items-center gap-2">
                      <input type="radio" id={`edit-dup-${v}`} name="edit_dup" checked={editForm.preventDuplicates === v}
                        onChange={() => setEditForm(p => ({ ...p, preventDuplicates: v }))}
                        style={{ accentColor: '#1677ff', width: '16px', height: '16px', cursor: 'pointer', float: 'none' }} />
                      <label htmlFor={`edit-dup-${v}`} style={{ cursor: 'pointer', marginBottom: 0, fontSize: 14 }}>{v}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Input Format <span className="text-danger">*</span></label>
                <InputFormatSelect value={editForm.inputFormat || ''} onChange={v => setEditForm(p => ({ ...p, inputFormat: v }))} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Default Value</label>
                <DefaultValueInput dataType={editForm.dataType} value={editForm.defaultValue}
                  onChange={v => setEditForm(p => ({ ...p, defaultValue: v }))} idPrefix="edit" />
              </div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <label className="form-label mb-0">Mandatory</label>
                <div className="form-check form-switch mb-0">
                  <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                    checked={editForm.mandatory === 'Yes'} onChange={e => setEditForm(p => ({ ...p, mandatory: e.target.checked ? 'Yes' : 'No' }))} />
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <label className="form-label mb-0">Show in all PDFs</label>
                <div className="form-check form-switch mb-0">
                  <input className="form-check-input switchCheckDefault" type="checkbox" role="switch"
                    checked={editForm.showInAllPdfs === 'Yes'} onChange={e => setEditForm(p => ({ ...p, showInAllPdfs: e.target.checked ? 'Yes' : 'No' }))} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Status</label>
                <div className="d-flex align-items-center gap-4">
                  {(['Active', 'Inactive'] as const).map(v => (
                    <div key={v} className="d-flex align-items-center gap-2">
                      <input type="radio" id={`edit-st-${v}`} name="edit_status" checked={editForm.status === v}
                        onChange={() => setEditForm(p => ({ ...p, status: v }))}
                        style={{ accentColor: '#1677ff', width: '16px', height: '16px', cursor: 'pointer', float: 'none' }} />
                      <label htmlFor={`edit-st-${v}`} style={{ cursor: 'pointer', marginBottom: 0, fontSize: 14 }}>{v === 'Active' ? 'Active' : 'Inactive'}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer py-2">
              <button type="button" className="btn btn-sm btn-light me-2" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MODAL — DELETE FIELD ══ */}
      <div className={`modal fade ${showDeleteModal ? 'show d-block' : ''}`} role="dialog"
        style={{ backgroundColor: showDeleteModal ? 'rgba(0,0,0,0.5)' : 'transparent' }}
        onClick={() => setShowDeleteModal(false)}>
        <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center">
                <div className="mb-3"><span className="avatar avatar-xl badge-soft-danger border-0 text-danger rounded-circle"><i className="ti ti-trash fs-24" /></span></div>
                <h4 className="mb-2">Delete Confirmation</h4>
                <p className="mb-1">Are you sure you want to remove</p>
                <p className="mb-0 fw-bold" style={{ color: '#dc3545' }}>"{deleteName}"</p>
                <div className="d-flex align-items-center justify-content-center mt-4 gap-2">
                  <button className="btn btn-sm btn-light me-2" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button className="btn btn-sm btn-danger" onClick={handleConfirmDelete}>Yes, Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MODAL — NEW LOCK CONFIGURATION ══ */}
      <div className={`modal fade ${showLockModal ? 'show d-block' : ''}`} role="dialog" style={{ backgroundColor: showLockModal ? 'rgba(0,0,0,0.5)' : 'transparent' }}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header py-3">
              <h5 className="modal-title" style={{ fontSize: 15 }}>New Lock Configuration</h5>
              <button type="button" className="btn-close custom-btn-close border p-1 me-0 d-flex align-items-center justify-content-center rounded-circle"
                onClick={() => { if (!lockSaving) setShowLockModal(false); }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Lock Name <span className="text-danger">*</span></label>
                <input className={`form-control${lockErr.name ? ' is-invalid' : ''}`} type="text" value={newLock.name} placeholder="Enter Lock Name"
                  onChange={e => { setNewLock(p => ({ ...p, name: e.target.value })); setLockErr(p => ({ ...p, name: '' })); }} autoFocus />
                {lockErr.name && <FieldError msg={lockErr.name} />}
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={2} value={newLock.description} placeholder="Optional"
                  onChange={e => setNewLock(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="card shadow-none border mb-0 pref-lock-card">
                <div className="card-header bg-light py-2 px-3">
                  <span className="fw-bold text-uppercase text-muted" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>Restrictions</span>
                </div>
                <div className="card-body p-3">
                  <div className="mb-3">
                    <label className="form-label">Restrict Actions</label>
                    <select className="form-select mb-2" value={newLock.action_type}
                      onChange={e => setNewLock(p => ({ ...p, action_type: e.target.value as any, selected_actions: [] }))}>
                      <option value="restrict_all">Restrict All Actions</option>
                      <option value="restrict_selected">Restrict Selected Actions</option>
                      <option value="allow_selected">Allow Only Selected Actions</option>
                    </select>
                    {newLock.action_type !== 'restrict_all' && (
                      <MultiSelectDropdown label="Actions" options={actionOptions} selected={newLock.selected_actions}
                        onChange={vals => { setNewLock(p => ({ ...p, selected_actions: vals })); setLockErr(p => ({ ...p, selected_actions: '' })); }}
                        placeholder="Select actions..." error={lockErr.selected_actions} />
                    )}
                  </div>
                  <div className="mb-3 pt-3 border-top">
                    <label className="form-label">Restrict Fields</label>
                    <select className="form-select mb-2" value={newLock.field_type}
                      onChange={e => setNewLock(p => ({ ...p, field_type: e.target.value as any, selected_fields: [] }))}>
                      <option value="restrict_all">Restrict All Fields</option>
                      <option value="restrict_selected">Restrict Selected Fields</option>
                      <option value="allow_selected">Allow Only Selected Fields</option>
                    </select>
                    {newLock.field_type !== 'restrict_all' && (
                      <MultiSelectDropdown label="Fields" options={fieldOptions} selected={newLock.selected_fields}
                        onChange={vals => { setNewLock(p => ({ ...p, selected_fields: vals })); setLockErr(p => ({ ...p, selected_fields: '' })); }}
                        placeholder="Select fields..." error={lockErr.selected_fields} />
                    )}
                  </div>
                  <div className="pt-3 border-top">
                    <label className="form-label">Lock For</label>
                    <select className="form-select mb-2" value={newLock.lock_for_type}
                      onChange={e => setNewLock(p => ({ ...p, lock_for_type: e.target.value as any, roles: [] }))}>
                      <option value="all_roles">All Roles</option>
                      <option value="all_roles_except">All Roles Except</option>
                      <option value="selected_roles">Selected Roles Only</option>
                    </select>
                    {newLock.lock_for_type !== 'all_roles' && (
                      <MultiSelectDropdown label="Roles" options={roleOptions} selected={newLock.roles}
                        onChange={vals => { setNewLock(p => ({ ...p, roles: vals })); setLockErr(p => ({ ...p, roles: '' })); }}
                        placeholder="Select roles..." error={lockErr.roles} />
                    )}
                    <div className="d-flex align-items-center gap-1 mt-2 text-muted" style={{ fontSize: '12px' }}>
                      <i className="ti ti-shield-check text-success" style={{ fontSize: '14px' }} />
                      Admins can always manage lock configurations.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer py-2">
              <button type="button" className="btn btn-sm btn-light me-2"
                onClick={() => { setShowLockModal(false); setNewLock(defaultLockForm); setLockErr({}); }}>Cancel</button>
              <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveLock} disabled={lockSaving}>
                {lockSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MODAL — DELETE LOCK ══ */}
      <div className={`modal fade ${showLockDeleteModal ? 'show d-block' : ''}`} role="dialog"
        style={{ backgroundColor: showLockDeleteModal ? 'rgba(0,0,0,0.5)' : 'transparent' }}
        onClick={() => setShowLockDeleteModal(false)}>
        <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center">
                <div className="mb-3"><span className="avatar avatar-xl badge-soft-danger border-0 text-danger rounded-circle"><i className="ti ti-trash fs-24" /></span></div>
                <h4 className="mb-2">Delete Confirmation</h4>
                <p className="mb-1">Are you sure you want to remove</p>
                <p className="mb-0 fw-bold" style={{ color: '#dc3545' }}>"{lockDeleteName}"</p>
                <div className="d-flex align-items-center justify-content-center mt-4 gap-2">
                  <button className="btn btn-sm btn-light me-2" onClick={() => setShowLockDeleteModal(false)}>Cancel</button>
                  <button className="btn btn-sm btn-danger" onClick={handleConfirmLockDelete}>Yes, Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </>
  );
};

export default ProductPreference;