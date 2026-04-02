<?php

namespace App\Http\Controllers;

use App\Models\AdditionalSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

class FieldCustomizationController extends Controller
{
    // ══════════════════════════════════════════════════════════════════
    //  DATA TYPE MAPS
    // ══════════════════════════════════════════════════════════════════

    private array $dataTypeMap = [
        'Text Box (Single Line)' => 'string',
        'Text Box (Multi Line)' => 'text',
        'Text Area (Multi Line)' => 'text',
        'Email' => 'email',
        'Phone' => 'phone',
        'Decimal' => 'decimal',
        'Integer' => 'integer',
        'Date' => 'date',
        'Date and Time' => 'datetime',
        'Date Time' => 'datetime',
        'DateTime' => 'datetime',
        'Dropdown' => 'array',
        'Boolean' => 'boolean',
        'Checkbox' => 'boolean',
        'URL' => 'url',
        'Image' => 'image',
        'Long Text' => 'longtext',
        'Character' => 'char',
        'Float' => 'float',
        'Double' => 'double',
        'Currency' => 'currency',
        'Percentage' => 'percentage',
        'Color' => 'color',
        'JSON' => 'json',
        'Array' => 'array',
        'UUID' => 'uuid',
        'Password' => 'password',
    ];

    private array $reverseTypeMap = [
        'string' => 'Text Box (Single Line)',
        'text' => 'Text Box (Multi Line)',
        'longtext' => 'Text Box (Multi Line)',
        'char' => 'Text Box (Single Line)',
        'email' => 'Email',
        'phone' => 'Phone',
        'decimal' => 'Decimal',
        'float' => 'Decimal',
        'double' => 'Decimal',
        'integer' => 'Integer',
        'biginteger' => 'Integer',
        'smallinteger' => 'Integer',
        'tinyinteger' => 'Integer',
        'date' => 'Date',
        'datetime' => 'Date Time',
        'timestamp' => 'Date Time',
        'time' => 'Date Time',
        'boolean' => 'Checkbox',
        'array' => 'Dropdown',
        'url' => 'URL',
        'image' => 'Image',
        'json' => 'JSON',
        'uuid' => 'UUID',
        'password' => 'Password',
        'currency' => 'Currency',
        'percentage' => 'Percentage',
        'color' => 'Color',
    ];

    // ══════════════════════════════════════════════════════════════════
    //  HELPER — Format a single field for the API response
    // ══════════════════════════════════════════════════════════════════

    private function formatField(AdditionalSetting $field): array
    {
        $config = $field->additional_config ?? [];

        return [
            'id' => $field->id,
            'fieldName' => $field->name ?? $field->label_name ?? '',
            'dataType' => $this->reverseTypeMap[$field->data_type] ?? 'Text Box (Single Line)',
            'defaultValue' => $config['default_value'] ?? '',
            'mandatory' => ($field->mandatory === 'yes') ? 'Yes' : 'No',
            'showInAllPdfs' => ($config['show_in_pdfs'] ?? false) ? 'Yes' : 'No',
            'status' => ($field->status === 'active') ? 'Active' : 'Inactive',
        ];
    }

    // ══════════════════════════════════════════════════════════════════
    //  GET /custom-fields  — List all fields
    // ══════════════════════════════════════════════════════════════════

    public function index(): JsonResponse
    {
        try {
            $fields = AdditionalSetting::latest()->get();

            return response()->json([
                'success' => true,
                'data' => $fields->map(fn($f) => $this->formatField($f))->values(),
            ]);
        } catch (Exception $e) {
            Log::error('FieldCustomizationController@index - ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to load fields.',
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  POST /field_customization  — Create a new field
    // ══════════════════════════════════════════════════════════════════

    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'label_name' => 'required|string|max:255',
                'data_type' => 'required|string',
                'mandatory' => 'required|in:yes,no',
                'status' => 'nullable|string|in:active,inactive',
                'default_value' => 'nullable|string|max:1000',
                'show_in_pdfs' => 'nullable|boolean',
            ]);

            DB::beginTransaction();

            $dbDataType = $this->dataTypeMap[$request->data_type] ?? 'string';

            $additional_config = array_filter([
                'default_value' => $request->default_value ?: null,
                'show_in_pdfs' => (bool) ($request->show_in_pdfs ?? false),
                'help_text' => null,
                'privacy_pii' => false,
                'created_at' => now()->toDateTimeString(),
            ], fn($v) => !is_null($v));

            $field = AdditionalSetting::create([
                'name' => $this->sanitizeString($request->label_name),
                'data_type' => $dbDataType,
                'mandatory' => $request->mandatory,    // 'yes' or 'no'
                'status' => $request->status ?? 'active',
                'additional_config' => $additional_config,
            ]);

            DB::commit();

            Log::info('FieldCustomizationController@store - Created ID: ' . $field->id, [
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Custom field created successfully.',
                'data' => $this->formatField($field),
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('FieldCustomizationController@store - ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create field. Please try again.',
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  PUT /field_customization/{id}  — Update a field
    // ══════════════════════════════════════════════════════════════════

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $request->validate([
                'label_name' => 'required|string|max:255',
                'data_type' => 'required|string',
                'mandatory' => 'required|in:yes,no',
                'status' => 'nullable|string|in:active,inactive',
                'default_value' => 'nullable|string|max:1000',
                'show_in_pdfs' => 'nullable|boolean',
            ]);

            DB::beginTransaction();

            $field = AdditionalSetting::findOrFail($id);
            $dbDataType = $this->dataTypeMap[$request->data_type] ?? 'string';
            $config = $field->additional_config ?? [];

            // Update only the fields we own — preserve the rest (access, etc.)
            $config['default_value'] = $request->default_value ?: null;
            $config['show_in_pdfs'] = (bool) ($request->show_in_pdfs ?? false);
            $config['updated_at'] = now()->toDateTimeString();

            $field->update([
                'name' => $this->sanitizeString($request->label_name),
                'data_type' => $dbDataType,
                'mandatory' => $request->mandatory,
                'status' => $request->status ?? $field->status,
                'additional_config' => $config,
            ]);

            DB::commit();

            Log::info('FieldCustomizationController@update - Updated ID: ' . $field->id, [
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Custom field updated successfully.',
                'data' => $this->formatField($field->fresh()),
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('FieldCustomizationController@update - ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update field.',
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  DELETE /field_customization/{id}  — Delete a field
    // ══════════════════════════════════════════════════════════════════

    public function destroy($id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $field = AdditionalSetting::findOrFail($id);
            $name = $field->name ?? 'Field';
            $field->delete();

            DB::commit();

            Log::info('FieldCustomizationController@destroy - Deleted ID: ' . $id, [
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => "\"{$name}\" deleted successfully.",
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('FieldCustomizationController@destroy - ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete field.',
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  PATCH /field_customization/{id}/toggle-status
    // ══════════════════════════════════════════════════════════════════

    public function toggleStatus($id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $field = AdditionalSetting::findOrFail($id);
            $newStatus = ($field->status === 'active') ? 'inactive' : 'active';
            $field->update(['status' => $newStatus]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Status updated to ' . $newStatus . '.',
                'data' => $this->formatField($field->fresh()),
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('FieldCustomizationController@toggleStatus - ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update status.',
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  PATCH /field_customization/{id}/toggle-mandatory
    // ══════════════════════════════════════════════════════════════════

    public function toggleMandatory($id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $field = AdditionalSetting::findOrFail($id);
            $newMandatory = ($field->mandatory === 'yes') ? 'no' : 'yes';
            $field->update(['mandatory' => $newMandatory]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Mandatory updated to ' . $newMandatory . '.',
                'data' => $this->formatField($field->fresh()),
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('FieldCustomizationController@toggleMandatory - ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update mandatory.',
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  PATCH /field_customization/{id}/toggle-pdf
    // ══════════════════════════════════════════════════════════════════

    public function togglePdf($id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $field = AdditionalSetting::findOrFail($id);
            $config = $field->additional_config ?? [];

            $config['show_in_pdfs'] = !($config['show_in_pdfs'] ?? false);
            $field->update(['additional_config' => $config]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'PDF visibility updated.',
                'data' => $this->formatField($field->fresh()),
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            Log::error('FieldCustomizationController@togglePdf - ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update PDF visibility.',
            ], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════════

    private function sanitizeString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        return htmlspecialchars(trim(strip_tags($value)), ENT_QUOTES, 'UTF-8');
    }
}