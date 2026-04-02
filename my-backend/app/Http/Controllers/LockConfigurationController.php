<?php

namespace App\Http\Controllers;

use App\Models\LockConfiguration;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Exception;

class LockConfigurationController extends Controller
{
    protected $logChannel = 'lock_config';

    // ================================================================
    //  SCHEMA
    // ================================================================

    const SCHEMA = [
        'name'             => ['type' => 'string',  'default' => null,          'nullable' => false, 'max' => 255],
        'description'      => ['type' => 'string',  'default' => null,          'nullable' => true],
        'module'           => ['type' => 'string',  'default' => 'items',       'allowed'  => ['items', 'sales', 'purchases', 'inventory']],
        'action_type'      => ['type' => 'string',  'default' => 'restrict_all','allowed'  => ['restrict_all', 'restrict_selected', 'allow_selected']],
        'selected_actions' => ['type' => 'array',   'default' => [],            'allowed'  => ['create', 'edit', 'delete', 'view', 'export', 'import']],
        'field_type'       => ['type' => 'string',  'default' => 'restrict_all','allowed'  => ['restrict_all', 'restrict_selected', 'allow_selected']],
        'selected_fields'  => ['type' => 'array',   'default' => [],            'allowed'  => [
            'item_name', 'sku', 'unit',
            'selling_price', 'purchase_price', 'cost_price',
            'sales_account', 'purchase_account', 'inventory_account',
            'opening_stock', 'opening_stock_value', 'reorder_point',
            'upc', 'mpn', 'manufacturer', 'ean',
            'weight_unit', 'description', 'tax',
            'vendor', 'brand', 'category',
        ]],
        'lock_for_type'    => ['type' => 'string',  'default' => 'all_roles',   'allowed'  => ['all_roles', 'all_roles_except', 'selected_roles']],
        'roles'            => ['type' => 'array',   'default' => [],            'allowed'  => ['zoho_admin', 'zoho_staff', 'zoho_manager']],
        'status'           => ['type' => 'string',  'default' => 'active',      'allowed'  => ['active', 'inactive']],
    ];

    // ================================================================
    //  HARDCODED BASE FIELDS (always present)
    // ================================================================

    private array $baseFields = [
        'item_name'           => 'Item Name',
        'sku'                 => 'SKU',
        'unit'                => 'Unit',
        'selling_price'       => 'Selling Price',
        'purchase_price'      => 'Purchase Price',
        'cost_price'          => 'Cost Price',
        'sales_account'       => 'Sales Account',
        'purchase_account'    => 'Purchase Account',
        'inventory_account'   => 'Inventory Account',
        'opening_stock'       => 'Opening Stock',
        'opening_stock_value' => 'Opening Stock Value',
        'reorder_point'       => 'Reorder Point',
        'upc'                 => 'Universal Product Code (UPC)',
        'mpn'                 => 'Manufacturer Part Number (MPN)',
        'manufacturer'        => 'Manufacturer',
        'ean'                 => 'European Article Number (EAN)',
        'weight_unit'         => 'Weight Unit',
        'description'         => 'Description',
        'tax'                 => 'Tax',
        'vendor'              => 'Vendor',
        'brand'               => 'Brand',
        'category'            => 'Category',
    ];

    private array $availableRoles = [
        'admin'   => 'Admin',
        'staff'   => 'Staff',
        'manager' => 'Manager',
    ];

    // ================================================================
    //  DYNAMIC FIELDS — additional_setting + setting_handle tables
    // ================================================================

    /**
     * additional_setting table → Active custom fields load பண்ணி
     * base fields-உடன் merge பண்ணு.
     *
     * additional_setting columns:
     *   - id, name, data_type, mandatory, status, additional_config (JSON), timestamps, deleted_at
     *
     * additional_config JSON example:
     *   { "label": "GST Number", "show_in_pdfs": true, "default_value": "" }
     */
    private function getAvailableFields(): array
    {
        $fields = $this->baseFields;

        try {
            $customFields = DB::table('additional_setting')
                ->whereNull('deleted_at')
                ->where('status', 'Active')
                ->select('id', 'name', 'data_type', 'additional_config')
                ->get();

            foreach ($customFields as $field) {
                // key: "custom_<id>" — unique, DB-safe
                $key = 'custom_' . $field->id;

                // Label: additional_config எல்லா fields-உம் show பண்ணு
                // primary label: name. additional_config-ல் label key இருந்தா override.
                $label = $field->name;
                $extraInfo = [];

                if ($field->additional_config) {
                    $additionalConfig = is_string($field->additional_config)
                        ? json_decode($field->additional_config, true)
                        : (array) $field->additional_config;

                    // label override
                    if (!empty($additionalConfig['label'])) {
                        $label = $additionalConfig['label'];
                    }

                    // Additional config-ல் உள்ள மற்ற fields — sub-fields ஆக add பண்ணு
                    foreach ($additionalConfig as $cfKey => $cfVal) {
                        if ($cfKey === 'label') continue; // label already handled
                        if (is_scalar($cfVal) && $cfVal !== '' && $cfVal !== null) {
                            $subKey   = $key . '__' . $cfKey;
                            $subLabel = $label . ' › ' . ucwords(str_replace('_', ' ', $cfKey));
                            $fields[$subKey] = $subLabel . ' (' . $field->data_type . ')';
                        }
                    }
                }

                // Main field
                $fields[$key] = $label . ' (' . $field->data_type . ')';
            }

        } catch (Exception $e) {
            $this->logError('GET_AVAILABLE_FIELDS', 'Failed to load custom fields from additional_setting', $e);
            // Fallback: base fields மட்டும் return
        }

        return $fields;
    }

    /**
     * setting_handle table → process config-லிருந்து Fields section-க்கு
     * fields extract பண்ணு.
     *
     * setting_handle columns:
     *   - id, process (unique string), config (JSON), timestamps, deleted_at
     *
     * config JSON-ல் 'fields' array இருக்கணும்:
     *   [
     *     { "key": "gst_number",  "additional_config": { "label": "GST Number" } },
     *     { "key": "pan_number",  "additional_config": { "label": "PAN Number" } }
     *   ]
     *   அல்லது plain:
     *   { "gst_number": "GST Number", "pan_number": "PAN Number" }
     *
     * additional_config.label மட்டும் use பண்ணும் — user-ன் requirement.
     */
    private function getFieldsFromSettingHandle(): array
    {
        $fields = [];

        try {
            $handles = DB::table('setting_handle')
                ->whereNull('deleted_at')
                ->select('id', 'process', 'config')
                ->get();

            foreach ($handles as $handle) {
                if (empty($handle->config)) continue;

                $config = is_string($handle->config)
                    ? json_decode($handle->config, true)
                    : (array) $handle->config;

                if (empty($config) || !is_array($config)) continue;

                $process = $handle->process;

                // ── Format 1: config['fields'] is array of objects with key + additional_config.label ──
                // [ { "key": "gst_number", "additional_config": { "label": "GST Number" } }, ... ]
                if (!empty($config['fields']) && is_array($config['fields'])) {
                    foreach ($config['fields'] as $item) {
                        if (is_array($item)) {
                            $key   = $item['key'] ?? null;
                            $label = null;

                            // additional_config.label மட்டும் use பண்ணு
                            if (!empty($item['additional_config']) && is_array($item['additional_config'])) {
                                $label = $item['additional_config']['label'] ?? null;
                            }

                            // label இல்லன்னா name / key fallback
                            if (empty($label)) {
                                $label = $item['name'] ?? $item['label'] ?? $key;
                            }

                            if ($key && $label) {
                                $fieldKey = 'sh_' . $process . '_' . $key;
                                $fields[$fieldKey] = $label . ' [' . $process . ']';
                            }

                        } elseif (is_string($item)) {
                            // Format 2: plain string array ["gst_number", "pan_number"]
                            $fieldKey = 'sh_' . $process . '_' . $item;
                            $fields[$fieldKey] = ucwords(str_replace('_', ' ', $item)) . ' [' . $process . ']';
                        }
                    }
                }

                // ── Format 3: config is key => label map directly ──
                // { "gst_number": "GST Number", "pan_number": "PAN Number" }
                if (empty($config['fields'])) {
                    foreach ($config as $k => $v) {
                        if (is_string($k) && is_string($v) && !in_array($k, ['description', 'locked', 'module', 'status'])) {
                            $fieldKey = 'sh_' . $process . '_' . $k;
                            $fields[$fieldKey] = $v . ' [' . $process . ']';
                        }
                    }
                }
            }

        } catch (Exception $e) {
            $this->logError('GET_FIELDS_FROM_SETTING_HANDLE', 'Failed to extract fields from setting_handle', $e);
        }

        return $fields;
    }

    /**
     * setting_handle table → Lock For section-க்கு process names load பண்ணு.
     * Roles-உடன் சேர்த்து show ஆகும்.
     * Returns: ['sh_process_name' => 'Process Label']
     */
    private function getProcessesFromSettingHandle(): array
    {
        $processes = [];

        try {
            $handles = DB::table('setting_handle')
                ->whereNull('deleted_at')
                ->select('id', 'process', 'config')
                ->get();

            foreach ($handles as $handle) {
                $process = $handle->process;
                $label   = ucwords(str_replace(['_', '-'], ' ', $process));

                // config-ல் label / name இருந்தா override
                if ($handle->config) {
                    $config = is_string($handle->config)
                        ? json_decode($handle->config, true)
                        : (array) $handle->config;

                    if (!empty($config['label']))       $label = $config['label'];
                    elseif (!empty($config['name']))    $label = $config['name'];
                    elseif (!empty($config['title']))   $label = $config['title'];
                }

                $processes['sh_process_' . $process] = $label;
            }

        } catch (Exception $e) {
            $this->logError('GET_PROCESSES_FROM_SETTING_HANDLE', 'Failed to load setting_handle processes', $e);
        }

        return $processes;
    }

    /**
     * Final merged available fields:
     * base fields + additional_setting fields + setting_handle config fields
     */
    private function getMergedAvailableFields(): array
    {
        $base    = $this->getAvailableFields();         // hardcode + additional_setting (with all additional_config sub-fields)
        $shExtra = $this->getFieldsFromSettingHandle(); // setting_handle config → fields section

        return array_merge($base, $shExtra);
    }

    /**
     * Final merged available roles:
     * hardcoded roles + setting_handle process names
     */
    private function getMergedAvailableRoles(): array
    {
        $base      = $this->availableRoles;                    // zoho_admin, zoho_staff, zoho_manager
        $processes = $this->getProcessesFromSettingHandle();   // setting_handle processes

        return array_merge($base, $processes);
    }

    // ================================================================
    //  CONSTRUCTOR
    // ================================================================

    public function __construct()
    {
        // Laravel default log use பண்ணும் — custom channel தேவையில்லை
    }

    // ================================================================
    //  LOGGING HELPERS
    // ================================================================

    private function logOperation($operation, $message, $context = [], $level = 'info')
    {
        try {
            $context = array_merge([
                'user_id'    => auth()->id(),
                'user_email' => optional(auth()->user())->email ?? 'system',
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'timestamp'  => now()->toDateTimeString(),
            ], $context);

            Log::$level("[LOCK_CONFIG] [{$operation}] {$message}", $context);
        } catch (Exception $e) {
            // Logging fail ஆனாலும் application break ஆகாது
        }
    }

    private function logError($operation, $message, $exception, $context = [])
    {
        try {
            $context = array_merge([
                'exception_message' => $exception->getMessage(),
                'exception_code'    => $exception->getCode(),
                'exception_file'    => $exception->getFile(),
                'exception_line'    => $exception->getLine(),
                'exception_trace'   => $exception->getTraceAsString(),
            ], $context);

            $this->logOperation($operation, $message, $context, 'error');
            try { report($exception); } catch (Exception $e) {}
        } catch (Exception $e) {}
    }

    // ================================================================
    //  SANITIZATION
    // ================================================================

    private function sanitizeString(?string $value): ?string
    {
        if ($value === null) return null;
        try {
            return htmlspecialchars(trim(strip_tags($value)), ENT_QUOTES, 'UTF-8');
        } catch (Exception $e) {
            return $value;
        }
    }

    // ================================================================
    //  INDEX — GET /lock_configuration
    // ================================================================

    public function index(): JsonResponse
    {
        $startTime = microtime(true);

        try {
            $this->logOperation('INDEX', 'Loading lock configurations');

            $configs = LockConfiguration::latest()->get();

            $this->logOperation('INDEX', 'Loaded successfully', [
                'count'             => $configs->count(),
                'execution_time_ms' => round((microtime(true) - $startTime) * 1000, 2),
            ]);

            return response()->json([
                'success' => true,
                'data'    => $configs,
            ]);

        } catch (Exception $e) {
            $this->logError('INDEX', 'Failed to load configurations', $e);

            return response()->json([
                'success' => false,
                'message' => 'Failed to load configurations. Please try again.',
            ], 500);
        }
    }

    // ================================================================
    //  CREATE — GET /lock_configuration/create
    // ================================================================

    public function create(): JsonResponse
    {
        try {
            $availableFields = $this->getMergedAvailableFields();

            return response()->json([
                'success'         => true,
                'availableFields' => $availableFields,
                'availableRoles'  => $this->getMergedAvailableRoles(),
                'defaults'        => collect(self::SCHEMA)->map(fn($s) => $s['default']),
            ]);

        } catch (Exception $e) {
            $this->logError('CREATE', 'Failed to load create metadata', $e);

            return response()->json([
                'success' => false,
                'message' => 'Failed to load create form data.',
            ], 500);
        }
    }

    // ================================================================
    //  META — GET /lock_configuration/meta  (dynamic fields & roles for React)
    // ================================================================

    public function meta(): JsonResponse
    {
        try {
            return response()->json([
                'success'        => true,
                'availableFields' => $this->getMergedAvailableFields(),
                'availableRoles'  => $this->getMergedAvailableRoles(),
            ]);
        } catch (Exception $e) {
            $this->logError('META', 'Failed to load meta data', $e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to load meta data.',
            ], 500);
        }
    }

    // ================================================================
    //  STORE — POST /lock_configuration
    // ================================================================

    public function store(Request $request): JsonResponse
    {
        $startTime = microtime(true);

        $this->logOperation('STORE', 'Starting creation', [
            'request_data' => $request->except(['_token']),
        ]);

        // ── Validation ──────────────────────────────────────────────
        try {
            $request->validate([
                'name'          => 'required|string|max:' . self::SCHEMA['name']['max'] . '|unique:lock_configuration,name',
                'description'   => 'nullable|string',
                'action_type'   => 'required|in:' . implode(',', self::SCHEMA['action_type']['allowed']),
                'field_type'    => 'required|in:' . implode(',', self::SCHEMA['field_type']['allowed']),
                'lock_for_type' => 'required|in:' . implode(',', self::SCHEMA['lock_for_type']['allowed']),
            ]);
        } catch (ValidationException $e) {
            $this->logError('STORE', 'Validation failed', $e);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $e->errors(),
            ], 422);
        }

        // ── DB Save ──────────────────────────────────────────────────
        try {
            DB::beginTransaction();

            $selectedActions = in_array($request->action_type, ['restrict_selected', 'allow_selected'])
                ? array_values(array_filter($request->input('selected_actions', [])))
                : [];

            $selectedFields = in_array($request->field_type, ['restrict_selected', 'allow_selected'])
                ? array_values(array_filter($request->input('selected_fields', [])))
                : [];

            $roles = in_array($request->lock_for_type, ['all_roles_except', 'selected_roles'])
                ? array_values(array_filter($request->input('roles', [])))
                : [];

            $configuration = LockConfiguration::create([
                'name'             => $this->sanitizeString($request->name),
                'description'      => $request->description ? $this->sanitizeString($request->description) : null,
                'module'           => self::SCHEMA['module']['default'],
                'action_type'      => $request->action_type,
                'selected_actions' => $selectedActions,
                'field_type'       => $request->field_type,
                'selected_fields'  => $selectedFields,
                'lock_for_type'    => $request->lock_for_type,
                'roles'            => $roles,
                'status'           => $request->input('status', self::SCHEMA['status']['default']),
            ]);

            DB::commit();

            $this->logOperation('STORE', 'Created successfully', [
                'configuration_id'  => $configuration->id,
                'name'              => $configuration->name,
                'execution_time_ms' => round((microtime(true) - $startTime) * 1000, 2),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Lock Configuration "' . $configuration->name . '" created successfully.',
                'data'    => $configuration,
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();
            $this->logError('STORE', 'Failed to create', $e);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create lock configuration: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ================================================================
    //  SHOW — GET /lock_configuration/{id}
    // ================================================================

    public function show(LockConfiguration $lockConfiguration): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $lockConfiguration,
        ]);
    }

    // ================================================================
    //  EDIT — GET /lock_configuration/{id}/edit
    // ================================================================

    public function edit(LockConfiguration $lockConfiguration): JsonResponse
    {
        try {
            $availableFields = $this->getMergedAvailableFields();

            return response()->json([
                'success'           => true,
                'data'              => $lockConfiguration,
                'availableFields'   => $availableFields,
                'availableRoles'    => $this->getMergedAvailableRoles(),
                'defaults'          => collect(self::SCHEMA)->map(fn($s) => $s['default']),
                'validation_errors' => $this->validateConfig($lockConfiguration),
            ]);

        } catch (Exception $e) {
            $this->logError('EDIT', 'Failed to load edit metadata', $e, [
                'configuration_id' => $lockConfiguration->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to load edit form data.',
            ], 500);
        }
    }

    // ================================================================
    //  UPDATE — PUT /lock_configuration/{id}
    // ================================================================

    public function update(Request $request, LockConfiguration $lockConfiguration): JsonResponse
    {
        $startTime = microtime(true);

        $this->logOperation('UPDATE', 'Starting update', [
            'configuration_id' => $lockConfiguration->id,
        ]);

        // ── Validation ──────────────────────────────────────────────
        try {
            $request->validate([
                'name'          => 'required|string|max:' . self::SCHEMA['name']['max'] . '|unique:lock_configuration,name,' . $lockConfiguration->id,
                'description'   => 'nullable|string',
                'action_type'   => 'required|in:' . implode(',', self::SCHEMA['action_type']['allowed']),
                'field_type'    => 'required|in:' . implode(',', self::SCHEMA['field_type']['allowed']),
                'lock_for_type' => 'required|in:' . implode(',', self::SCHEMA['lock_for_type']['allowed']),
            ]);
        } catch (ValidationException $e) {
            $this->logError('UPDATE', 'Validation failed', $e);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $e->errors(),
            ], 422);
        }

        // ── DB Update ────────────────────────────────────────────────
        try {
            DB::beginTransaction();

            $selectedActions = in_array($request->action_type, ['restrict_selected', 'allow_selected'])
                ? array_values(array_filter($request->input('selected_actions', [])))
                : [];

            $selectedFields = in_array($request->field_type, ['restrict_selected', 'allow_selected'])
                ? array_values(array_filter($request->input('selected_fields', [])))
                : [];

            $roles = in_array($request->lock_for_type, ['all_roles_except', 'selected_roles'])
                ? array_values(array_filter($request->input('roles', [])))
                : [];

            $lockConfiguration->update([
                'name'             => $this->sanitizeString($request->name),
                'description'      => $request->description ? $this->sanitizeString($request->description) : null,
                'action_type'      => $request->action_type,
                'selected_actions' => $selectedActions,
                'field_type'       => $request->field_type,
                'selected_fields'  => $selectedFields,
                'lock_for_type'    => $request->lock_for_type,
                'roles'            => $roles,
            ]);

            DB::commit();

            $this->logOperation('UPDATE', 'Updated successfully', [
                'configuration_id'  => $lockConfiguration->id,
                'execution_time_ms' => round((microtime(true) - $startTime) * 1000, 2),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Lock Configuration "' . $lockConfiguration->name . '" updated successfully.',
                'data'    => $lockConfiguration->fresh(),
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            $this->logError('UPDATE', 'Failed to update', $e, [
                'configuration_id' => $lockConfiguration->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update lock configuration: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ================================================================
    //  DESTROY — DELETE /lock_configuration/{id}
    // ================================================================

    public function destroy(LockConfiguration $lockConfiguration): JsonResponse
    {
        $startTime  = microtime(true);
        $configId   = $lockConfiguration->id;
        $configName = $lockConfiguration->name;

        $this->logOperation('DESTROY', 'Starting deletion', [
            'configuration_id'   => $configId,
            'configuration_name' => $configName,
        ]);

        try {
            DB::beginTransaction();
            $lockConfiguration->delete();
            DB::commit();

            $this->logOperation('DESTROY', 'Deleted successfully', [
                'configuration_id'  => $configId,
                'name'              => $configName,
                'execution_time_ms' => round((microtime(true) - $startTime) * 1000, 2),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Lock Configuration "' . $configName . '" deleted successfully.',
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            $this->logError('DESTROY', 'Failed to delete', $e, [
                'configuration_id' => $configId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete lock configuration: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ================================================================
    //  TOGGLE STATUS — PATCH /lock_configuration/{id}/toggle
    // ================================================================

    public function toggleStatus(LockConfiguration $lockConfiguration): JsonResponse
    {
        $startTime = microtime(true);
        $configId  = $lockConfiguration->id;
        $oldStatus = $lockConfiguration->status;

        // SCHEMA allowed values use பண்ணி toggle
        $allowedStatuses = self::SCHEMA['status']['allowed'];
        $currentIndex    = array_search($oldStatus, $allowedStatuses);
        $newStatus       = $allowedStatuses[($currentIndex + 1) % count($allowedStatuses)];

        $this->logOperation('TOGGLE_STATUS', 'Starting status toggle', [
            'configuration_id' => $configId,
            'current_status'   => $oldStatus,
            'new_status'       => $newStatus,
        ]);

        try {
            DB::beginTransaction();
            $lockConfiguration->update(['status' => $newStatus]);
            DB::commit();

            $this->logOperation('TOGGLE_STATUS', 'Status toggled successfully', [
                'configuration_id'  => $configId,
                'old_status'        => $oldStatus,
                'new_status'        => $newStatus,
                'execution_time_ms' => round((microtime(true) - $startTime) * 1000, 2),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Status changed to "' . $newStatus . '" for "' . $lockConfiguration->name . '".',
                'data'    => $lockConfiguration->fresh(),
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            $this->logError('TOGGLE_STATUS', 'Failed to toggle status', $e, [
                'configuration_id' => $configId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to change status: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ================================================================
    //  VALIDATE CONFIG (internal helper)
    // ================================================================

    public function validateConfig(LockConfiguration $lockConfiguration): array
    {
        $errors = [];
        try {
            $config = $lockConfiguration->toArray();

            if (in_array($config['action_type'], ['restrict_selected', 'allow_selected']) && empty($config['selected_actions'])) {
                $errors[] = 'Selected actions cannot be empty when action type is restrict_selected or allow_selected.';
            }
            if (in_array($config['field_type'], ['restrict_selected', 'allow_selected']) && empty($config['selected_fields'])) {
                $errors[] = 'Selected fields cannot be empty when field type is restrict_selected or allow_selected.';
            }
            if (in_array($config['lock_for_type'], ['all_roles_except', 'selected_roles']) && empty($config['roles'])) {
                $errors[] = 'Roles cannot be empty when lock for type is all_roles_except or selected_roles.';
            }
            if (!in_array($config['action_type'],   self::SCHEMA['action_type']['allowed']))   $errors[] = 'Invalid action_type: '   . $config['action_type'];
            if (!in_array($config['field_type'],     self::SCHEMA['field_type']['allowed']))    $errors[] = 'Invalid field_type: '    . $config['field_type'];
            if (!in_array($config['lock_for_type'],  self::SCHEMA['lock_for_type']['allowed'])) $errors[] = 'Invalid lock_for_type: ' . $config['lock_for_type'];
            if (!in_array($config['status'],         self::SCHEMA['status']['allowed']))        $errors[] = 'Invalid status: '        . $config['status'];

        } catch (Exception $e) {
            $errors[] = 'Failed to validate configuration: ' . $e->getMessage();
        }
        return $errors;
    }

    // ================================================================
    //  HELPER — isFieldLocked (application logic use)
    // ================================================================

    public function getConfigurationsByModule(string $module): array
    {
        try {
            if (!in_array($module, self::SCHEMA['module']['allowed'])) return [];
            return LockConfiguration::where('module', $module)
                ->where('status', self::SCHEMA['status']['default'])
                ->get()->toArray();
        } catch (Exception $e) {
            $this->logError('GET_BY_MODULE', 'Failed', $e, ['module' => $module]);
            return [];
        }
    }

    public function isFieldLocked(string $field, string $userRole): bool
    {
        try {
            $configs = $this->getConfigurationsByModule(self::SCHEMA['module']['default']);
            foreach ($configs as $config) {
                if ($this->doesRoleApply($config, $userRole) && $this->isFieldAffected($config, $field)) {
                    return true;
                }
            }
            return false;
        } catch (Exception $e) {
            $this->logError('CHECK_FIELD_LOCK', 'Error', $e);
            return false;
        }
    }

    private function doesRoleApply(array $config, string $userRole): bool
    {
        try {
            return match ($config['lock_for_type']) {
                'all_roles'        => true,
                'all_roles_except' => !in_array($userRole, $config['roles']),
                'selected_roles'   => in_array($userRole, $config['roles']),
                default            => false,
            };
        } catch (Exception $e) { return false; }
    }

    private function isFieldAffected(array $config, string $field): bool
    {
        try {
            return match ($config['field_type']) {
                'restrict_all'      => true,
                'restrict_selected' => in_array($field, $config['selected_fields']),
                'allow_selected'    => !in_array($field, $config['selected_fields']),
                default             => false,
            };
        } catch (Exception $e) { return false; }
    }
}