<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Brand;
use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    protected $cacheTags = ['products'];
    protected $logChannel = 'product';

    // ================================================================
    //  SCHEMA — sales_description & purchase_description REMOVED
    //           (additional_data JSON- description nested-ஆ store)
    // ================================================================

    const SCHEMA = [
        'name' => [
            'type'     => 'string',
            'default'  => null,
            'max'      => 255,
            'nullable' => false,
        ],
        'type' => [
            'type'    => 'string',
            'default' => 'goods',
            'allowed' => ['goods', 'service'],
        ],
        'brand_id' => [
            'type'     => 'integer',
            'default'  => null,
            'nullable' => true,
        ],
        'item_variant_type' => [
            'type'    => 'string',
            'default' => 'single',
            'allowed' => ['single', 'contains_variants'],
        ],
        'unit' => [
            'type'    => 'string',
            'default' => null,
            'max'     => 50,
        ],
        'sku' => [
            'type'     => 'string',
            'default'  => null,
            'max'      => 255,
            'nullable' => true,
        ],
        'selling_price' => [
            'type'     => 'float',
            'default'  => null,
            'min'      => 0,
            'nullable' => true,
        ],
        'cost_price' => [
            'type'     => 'float',
            'default'  => null,
            'min'      => 0,
            'nullable' => true,
        ],
        'track_inventory' => [
            'type'    => 'boolean',
            'default' => true,
        ],
        'bin_location_tracking' => [
            'type'    => 'boolean',
            'default' => false,
        ],
        'inventory_valuation_method' => [
            'type'     => 'string',
            'default'  => null,
            'allowed'  => ['FIFO', 'Weighted Average'],
            'nullable' => true,
        ],
        'reorder_point' => [
            'type'     => 'float',
            'default'  => null,
            'min'      => 0,
            'nullable' => true,
        ],
        'is_returnable' => [
            'type'    => 'boolean',
            'default' => true,
        ],
        'custom_field' => [
            'length' => [
                'type'     => 'float',
                'default'  => null,
                'min'      => 0,
                'nullable' => true,
            ],
            'width' => [
                'type'     => 'float',
                'default'  => null,
                'min'      => 0,
                'nullable' => true,
            ],
            'height' => [
                'type'     => 'float',
                'default'  => null,
                'min'      => 0,
                'nullable' => true,
            ],
            'dimension_unit' => [
                'type'    => 'string',
                'default' => 'cm',
                'allowed' => ['cm', 'm', 'in', 'ft', 'mm'],
            ],
            'weight' => [
                'type'     => 'float',
                'default'  => null,
                'min'      => 0,
                'nullable' => true,
            ],
            'weight_unit' => [
                'type'    => 'string',
                'default' => 'kg',
                'allowed' => ['kg', 'g', 'lb', 'oz', 'mg'],
            ],
        ],
    ];

    // ================================================================

    public function __construct()
    {
        Log::build([
            'driver' => 'single',
            'path'   => storage_path('logs/products.log'),
            'level'  => env('LOG_LEVEL', 'debug'),
        ]);
    }

    private function logProductOperation($operation, $message, $context = [], $level = 'info')
    {
        $context = array_merge([
            'user_id'    => auth()->id(),
            'user_email' => auth()->user()->email ?? 'system',
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'timestamp'  => now()->toDateTimeString(),
        ], $context);

        Log::channel($this->logChannel)->$level("[PRODUCT] [{$operation}] {$message}", $context);
        Log::$level("[ProductController:{$operation}] {$message}", $context);
    }

    private function logProductError($operation, $message, $exception, $context = [])
    {
        $context = array_merge([
            'exception_message' => $exception->getMessage(),
            'exception_code'    => $exception->getCode(),
            'exception_file'    => $exception->getFile(),
            'exception_line'    => $exception->getLine(),
            'exception_trace'   => $exception->getTraceAsString(),
        ], $context);

        $this->logProductOperation($operation, $message, $context, 'error');
        report($exception);
    }

    private function clearProductCache($productId = null)
    {
        try {
            $tags = $this->cacheTags;
            if ($productId) {
                Cache::tags($tags)->forget("product.{$productId}");
                $this->logProductOperation('CACHE', "Cleared cache for product ID: {$productId}");
            }
            Cache::tags($tags)->flush();
            $this->logProductOperation('CACHE', 'Cleared all product cache');
        } catch (\Exception $e) {
            $this->logProductError('CACHE_ERROR', 'Failed to clear product cache', $e);
        }
    }

    // ================================================================
    //  SCHEMA HELPERS
    // ================================================================

    private function sanitizeProductData(array $input): array
    {
        $sanitized = [];

        foreach ($input as $key => $value) {
            if ($key === 'custom_field') {
                continue;
            }

            $schema = self::SCHEMA[$key] ?? null;
            if (!$schema) continue;

            if (($schema['nullable'] ?? false) && is_null($value)) {
                $sanitized[$key] = null;
                continue;
            }

            if (is_string($value)) {
                $value = $this->sanitizeString($value);
            }

            $value = $this->castValue($value, $schema['type']);

            if (isset($schema['min']) && is_numeric($value)) {
                $value = max($schema['min'], $value);
            }
            if (isset($schema['max']) && is_numeric($value)) {
                $value = min($schema['max'], $value);
            }

            if (isset($schema['allowed']) && !in_array($value, $schema['allowed'], true)) {
                $value = $schema['default'];
            }

            $sanitized[$key] = $value;
        }

        return $sanitized;
    }

    private function sanitizeCustomField(array $input): array
    {
        $sanitized = [];
        $cfSchema  = self::SCHEMA['custom_field'];

        foreach ($cfSchema as $key => $schema) {
            $value = $input[$key] ?? $schema['default'];

            if (($schema['nullable'] ?? false) && is_null($value)) {
                $sanitized[$key] = null;
                continue;
            }

            $value = $this->castValue($value, $schema['type']);

            if (isset($schema['min']) && is_numeric($value)) {
                $value = max($schema['min'], $value);
            }

            if (isset($schema['allowed']) && !in_array($value, $schema['allowed'], true)) {
                $value = $schema['default'];
            }

            $sanitized[$key] = $value;
        }

        return $sanitized;
    }

    private function castValue(mixed $value, string $type): mixed
    {
        return match ($type) {
            'string'  => (string) $value,
            'integer' => (int) $value,
            'float'   => (float) $value,
            'boolean' => (bool) $value,
            'array'   => is_array($value) ? $value : [],
            default   => $value,
        };
    }

    private function sanitizeString(string $value): string
    {
        return htmlspecialchars(trim(strip_tags($value)), ENT_QUOTES, 'UTF-8');
    }

    // ================================================================
    //  IMAGE HELPERS
    // ================================================================

    private function uploadImage($file): string
    {
        try {
            $filename     = time() . '_front_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $publicFolder = public_path('image/product_img');

            $this->logProductOperation('IMAGE_UPLOAD', 'Starting image upload', [
                'original_name' => $file->getClientOriginalName(),
                'size'          => $file->getSize(),
                'mime'          => $file->getMimeType(),
            ]);

            if (file_exists($publicFolder)) {
                $file->move($publicFolder, $filename);
                $path = 'image/product_img/' . $filename;
                $this->logProductOperation('IMAGE_UPLOAD', 'Image saved to public folder', ['path' => $path]);
                return $path;
            } else {
                $path        = $file->storeAs('product_img', $filename, 'public');
                $storagePath = 'storage:product_img/' . $filename;
                $this->logProductOperation('IMAGE_UPLOAD', 'Image saved to storage', ['path' => $path]);
                return $storagePath;
            }
        } catch (\Exception $e) {
            $this->logProductError('IMAGE_UPLOAD_ERROR', 'Failed to upload image', $e);
            throw $e;
        }
    }

    private function deleteImage(string $path): void
    {
        try {
            if (str_starts_with($path, 'storage:')) {
                $storagePath = str_replace('storage:', '', $path);
                Storage::disk('public')->delete($storagePath);
            } else {
                $fullPath = public_path($path);
                if (file_exists($fullPath)) {
                    unlink($fullPath);
                }
            }
        } catch (\Exception $e) {
            $this->logProductError('IMAGE_DELETE_ERROR', 'Failed to delete image', $e, ['path' => $path]);
        }
    }

    public static function imageUrl(?string $path): ?string
    {
        if (!$path) return null;

        try {
            if (str_starts_with($path, 'storage:')) {
                $storagePath = str_replace('storage:', '', $path);
                return Storage::disk('public')->url($storagePath);
            }
            return asset($path);
        } catch (\Exception $e) {
            Log::error('Failed to generate image URL', ['path' => $path, 'error' => $e->getMessage()]);
            return null;
        }
    }

    // ================================================================
    //  HELPER — description array build
    // ================================================================

    private function buildDescriptionData(Request $request, array $existing = []): array
    {
        return [
            'description' => [
                'items_description'    => $request->items_description
                    ?? $existing['description']['items_description']    ?? null,
                'sales_description'    => $request->sales_description
                    ?? $existing['description']['sales_description']    ?? null,
                'purchase_description' => $request->purchase_description
                    ?? $existing['description']['purchase_description'] ?? null,
            ],
        ];
    }

    // ================================================================
    //  INDEX
    // ================================================================

    public function index(Request $request)
    {
        $operation = 'INDEX';
        $startTime = microtime(true);

        try {
            $this->logProductOperation($operation, 'Starting product listing', [
                'request_params' => $request->all(),
            ]);

            if ($request->expectsJson() || $request->is('api/*')) {
                $query = Product::query();

                if ($request->has('search')) {
                    $search = $request->search;
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'LIKE', "%{$search}%")
                          ->orWhere('sku',  'LIKE', "%{$search}%");
                    });
                }

                if ($request->has('type'))     $query->where('type',     $request->type);
                if ($request->has('brand_id')) $query->where('brand_id', $request->brand_id);

                $perPage  = $request->per_page ?? 15;
                $products = $query->orderBy('created_at', 'desc')->paginate($perPage);

                $executionTime = round((microtime(true) - $startTime) * 1000, 2);

                return response()->json([
                    'success' => true,
                    'data'    => $products,
                    'meta'    => ['execution_time_ms' => $executionTime],
                ]);
            }

            $products = Product::latest()->paginate(10);

            $customFields = \App\Models\AdditionalSetting::where('status', 'active')
                ->where('category_name', 'products')
                ->get();

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);

            $this->logProductOperation($operation, 'Products view rendered', [
                'total'             => $products->total(),
                'execution_time_ms' => $executionTime,
            ]);

            return view('products.index', compact('products', 'customFields'));

        } catch (\Exception $e) {
            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            $this->logProductError($operation, 'Failed to list products', $e, [
                'execution_time_ms' => $executionTime,
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve products',
                    'error'   => config('app.debug') ? $e->getMessage() : 'Internal server error',
                ], 500);
            }

            return redirect()->back()->with('error', 'Failed to retrieve products');
        }
    }

    // ================================================================
    //  CREATE
    // ================================================================

    public function create()
    {
        $operation = 'CREATE_VIEW';

        try {
            $this->logProductOperation($operation, 'Loading product creation form');

            $brands       = Brand::orderBy('name')->get();
            $customFields = \App\Models\AdditionalSetting::forModule('products')->get();

            $settingRow = \App\Models\SettingHandle::where('category_name', 'products')->first();
            $settings   = $settingRow ? ($settingRow->config ?? []) : [];

            $this->logProductOperation($operation, 'Product creation form loaded', [
                'brands_count'        => $brands->count(),
                'custom_fields_count' => $customFields->count(),
            ]);

            return view('products.create', compact('brands', 'customFields', 'settings'));

        } catch (\Exception $e) {
            $this->logProductError($operation, 'Failed to load product creation form', $e);
            return redirect()->back()->with('error', 'Failed to load product creation form');
        }
    }

    // ================================================================
    //  STORE
    // ================================================================

    public function store(Request $request)
    {
        $operation      = 'STORE';
        $startTime      = microtime(true);
        $frontImagePath = null;

        try {
            $this->logProductOperation($operation, 'Starting product creation', [
                'request_data' => $request->except(['front_image']),
            ]);

            $validator = Validator::make($request->all(), [
                'name'                        => 'required|string|max:255',
                'type'                        => 'required|in:goods,service',
                'brand_id'                    => 'nullable|exists:brands,id',
                'item_variant_type'           => 'required|in:single,contains_variants',
                'unit'                        => 'required|string|max:50',
                'sku'                         => ['nullable', 'string', Rule::unique('products', 'sku')->whereNull('deleted_at')],
                'selling_price'               => 'nullable|numeric|min:0',
                'cost_price'                  => 'nullable|numeric|min:0',
                'items_description'           => 'nullable|string',
                'sales_description'           => 'nullable|string',
                'purchase_description'        => 'nullable|string',
                'track_inventory'             => 'boolean',
                'bin_location_tracking'       => 'boolean',
                'inventory_valuation_method'  => 'nullable|in:FIFO,Weighted Average',
                'reorder_point'               => 'nullable|numeric|min:0',
                'is_returnable'               => 'boolean',
                'custom_field'                => 'nullable|array',
                'custom_field.length'         => 'nullable|numeric',
                'custom_field.width'          => 'nullable|numeric',
                'custom_field.height'         => 'nullable|numeric',
                'custom_field.dimension_unit' => 'nullable|in:cm,m,in,ft,mm',
                'custom_field.weight'         => 'nullable|numeric',
                'custom_field.weight_unit'    => 'nullable|in:kg,g,lb,oz,mg',
                'front_image'                 => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
                'additional_fields'           => 'nullable|array',
            ]);

           $variantsData = json_decode($request->input('variants_json'), true);

if (!empty($variantsData['variants'])) {
    $imgDir = public_path('product_img');
    if (!is_dir($imgDir)) {
        mkdir($imgDir, 0755, true);
    }

    foreach ($variantsData['variants'] as &$variant) {
        if (!empty($variant['product_image_base64'])) {
            $base64String = $variant['product_image_base64'];
            if (str_contains($base64String, ',')) {
                $base64String = explode(',', $base64String, 2)[1];
            }
            $imageData = base64_decode($base64String);
            $filename  = basename($variant['product_image'] ?? 'variant_' . uniqid() . '.jpg');

            file_put_contents($imgDir . DIRECTORY_SEPARATOR . $filename, $imageData);

            // DB-ல் path மட்டும் — base64 save பண்ண வேண்டாம்
            $variant['product_image'] = 'product_img/' . $filename;
            unset($variant['product_image_base64']);  // ← இது மிக முக்கியம்
        } else {
            $variant['product_image'] = null;
            unset($variant['product_image_base64']);
        }
    }
    unset($variant);
}
            if ($validator->fails()) {
                $this->logProductOperation($operation, 'Validation failed', [
                    'errors' => $validator->errors()->toArray(),
                ], 'warning');

                if ($request->expectsJson()) {
                    return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
                }

                return redirect()->back()->withErrors($validator)->withInput();
            }

            DB::beginTransaction();

            if ($request->hasFile('front_image')) {
                $frontImagePath = $this->uploadImage($request->file('front_image'));
            }

            $brandName = null;
            if ($request->brand_id) {
                $brand     = Brand::find($request->brand_id);
                $brandName = $brand ? $brand->name : null;
            }

            $sanitized = $this->sanitizeProductData([
                'name'                       => $request->name,
                'type'                       => $request->type,
                'brand_id'                   => $request->brand_id,
                'item_variant_type'          => $request->item_variant_type,
                'unit'                       => $request->unit,
                'sku'                        => $request->sku,
                'selling_price'              => $request->selling_price,
                'cost_price'                 => $request->cost_price,
                'track_inventory'            => $request->track_inventory ?? true,
                'bin_location_tracking'      => $request->bin_location_tracking ?? false,
                'inventory_valuation_method' => $request->inventory_valuation_method,
                'reorder_point'              => $request->reorder_point,
                'is_returnable'              => $request->is_returnable ?? true,
            ]);
  
          // Decode variants_json from frontend
        $variantsData = null;
if ($request->item_variant_type === 'contains_variants' && $request->filled('variants_json')) {
    $decoded = json_decode($request->variants_json, true);
    if (json_last_error() === JSON_ERROR_NONE) {

        if (!empty($decoded['variants'])) {
            $imgDir = public_path('image/product_img');
            if (!is_dir($imgDir)) {
                mkdir($imgDir, 0755, true);
            }
            foreach ($decoded['variants'] as &$variant) {
                if (!empty($variant['product_image_base64'])) {
                    $b64 = $variant['product_image_base64'];
                    if (str_contains($b64, ',')) {
                        $b64 = explode(',', $b64, 2)[1];
                    }
                    $filename = 'variant_' . ($variant['name'] ?? uniqid()) . '_' . time() . '.jpg';
                    file_put_contents($imgDir . DIRECTORY_SEPARATOR . $filename, base64_decode($b64));

                    // DB-ல் variant name + path மட்டும்
                    $variant['product_image'] = 'image/product_img/' . $filename;
                }
                unset($variant['product_image_base64']); // base64 remove
            }
            unset($variant);
        }

        $variantsData = $decoded;
    }
}
    $productData = array_merge($sanitized, [
    'brand'         => $brandName,
    'product_image' => json_encode(['front_image' => $frontImagePath]),
    'variants_data' => $variantsData ? json_encode($variantsData) : null,
    'additional_data' => json_encode(array_merge(
        $this->sanitizeCustomField($request->input('custom_field', [])),
        $this->resolveAdditionalFields($request->input('additional_fields', [])),
        [
            'upc'  => $request->upc  ?? null,
            'mpn'  => $request->mpn  ?? null,
            'ean'  => $request->ean  ?? null,
            'isbn' => $request->isbn ?? null,
        ],
        [
            'account_details' => [
                'inventory_account' => $request->inventory_account_id ?? null,
                'preferred_vendor'  => $request->preferred_vendor_id  ?? null,
            ],
        ],
        $this->buildDescriptionData($request),
        [
            'category' => [
                'id'   => $request->category_id   ? (int)$request->category_id : null,
                'name' => $request->category_name ?? null,
            ],
        ]
    )),
]);

            $product = Product::create($productData);

            DB::commit();

            $this->clearProductCache();

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            $this->logProductOperation($operation, 'Product created successfully', [
                'product_id'        => $product->id,
                'product_name'      => $product->name,
                'execution_time_ms' => $executionTime,
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Product created successfully',
                    'data'    => $product,
                    'meta'    => ['execution_time_ms' => $executionTime],
                ], 201);
            }

            return redirect()->route('products.index')->with('success', 'Product created successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            if ($frontImagePath) $this->deleteImage($frontImagePath);

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            $this->logProductError($operation, 'Failed to create product', $e, [
                'execution_time_ms' => $executionTime,
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create product',
                    'error'   => config('app.debug') ? $e->getMessage() : 'Internal server error',
                ], 500);
            }

            return redirect()->back()
                ->with('error', 'Failed to create product: ' . $e->getMessage())
                ->withInput();
        }
    }

    // ================================================================
    //  SAVE OPENING STOCK
    // ================================================================
public function saveOpeningStock(Request $request, $product)
{
    $product = Product::findOrFail($product);

    if (!$product->track_inventory) {
        return response()->json([
            'success' => false,
            'message' => 'This product does not track inventory.',
        ], 403);
    }

    $rows = $request->input('rows', []);

    if (empty($rows)) {
        return response()->json(['success' => false, 'message' => 'No rows received.'], 422);
    }

    $validator = \Validator::make($request->all(), [
        'rows'                   => 'required|array|min:1',
        'rows.*.bin_location_id' => 'required|exists:locations,id',
        'rows.*.quantity'        => 'required|numeric|min:0',
        'rows.*.value_per_unit'  => 'nullable|numeric|min:0',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Validation failed.',
            'errors'  => $validator->errors()->toArray(),
        ], 422);
    }

    // ✅ STEP 1: OLD stock — loop start ஆவதுக்கு முன்னாடி எடு
    $oldStockMap   = [];
    $oldTotalStock = 0;

    foreach ($rows as $row) {
        $locId = $row['bin_location_id'];
        $old   = (float)(\App\Models\Stock::where('product_id', $product->id)
                    ->where('location_id', $locId)
                    ->whereNull('deleted_at')
                    ->value('stock_on_hand') ?? 0);
        $oldStockMap[$locId] = $old;
        $oldTotalStock      += $old;
    }

    // ✅ STEP 2: Stock update
    $updatedLocations = [];

    foreach ($rows as $row) {
        $qty        = (float) ($row['quantity']       ?? 0);
        $valPerUnit = (float) ($row['value_per_unit'] ?? 0);
        $totalValue = $qty * $valPerUnit;
        $locId      = $row['bin_location_id'];

        try {
            $stock = \App\Models\Stock::withTrashed()
                ->where('product_id', $product->id)
                ->where('location_id', $locId)
                ->first();

            if ($stock) {
                if ($stock->trashed()) $stock->restore();
                $stock->update([
                    'opening_stock'   => $qty,
                    'stock_on_hand'   => $qty,
                    'committed_stock' => 0,
                    'available_stock' => $qty,
                    'value_per_unit'  => $valPerUnit,
                    'total_value'     => $totalValue,
                    'type'            => 'opening',
                ]);
            } else {
                $stock = \App\Models\Stock::create([
                    'product_id'      => $product->id,
                    'location_id'     => $locId,
                    'opening_stock'   => $qty,
                    'stock_on_hand'   => $qty,
                    'committed_stock' => 0,
                    'available_stock' => $qty,
                    'value_per_unit'  => $valPerUnit,
                    'total_value'     => $totalValue,
                    'type'            => 'opening',
                ]);
            }

            $loc = Location::find($locId);

            $updatedLocations[] = [
                'id'            => (int) $loc->id,
                'location_name' => $loc->location_name,
                'stock_on_hand' => (float) $stock->stock_on_hand,
                'committed'     => (float) $stock->committed_stock,
                'available'     => (float) $stock->available_stock,
            ];

        } catch (\Exception $e) {
            \Log::error('Stock save error', ['row' => $row, 'error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'DB error: ' . $e->getMessage()], 500);
        }
    }

    // ✅ STEP 3: Total stock
    $totalStock = \App\Models\Stock::where('product_id', $product->id)
        ->whereNull('deleted_at')
        ->sum('stock_on_hand');

    // ✅ STEP 4: Observer duplicate தவிர்க்க — withoutEvents பயன்படுத்து
    Product::withoutEvents(function () use ($product, $totalStock) {
        $product->update(['opening_stock' => $totalStock]);
    });

    // ✅ STEP 5: Changed locations மட்டும் filter பண்ணு
    $changedOld = [];
    $changedNew = [];

    foreach ($updatedLocations as $l) {
        $locId    = $l['id'];
        $oldStock = $oldStockMap[$locId] ?? 0;
        $newStock = (float) $l['stock_on_hand'];

        if ($oldStock !== $newStock) {
            $changedOld[] = ['location' => $l['location_name'], 'stock' => $oldStock];
            $changedNew[] = ['location' => $l['location_name'], 'stock' => $newStock];
        }
    }

    // ✅ STEP 6: Changed இருந்தா மட்டும் History save
    if (!empty($changedNew)) {
        \App\Models\History::create([
            'module'    => 'product',
            'action'    => 'stock_updated',
            'record_id' => $product->id,
            'user_id'   => Auth::id(),
            'old_data'  => [
                'total_stock' => $oldTotalStock,
                'locations'   => $changedOld,
            ],
            'new_data'  => [
                'total_stock' => (float) $totalStock,
                'locations'   => $changedNew,
            ],
        ]);
    }

    return response()->json([
        'success'        => true,
        'message'        => 'Opening stock saved successfully.',
        'stockLocations' => $updatedLocations,
        'total_stock'    => (float) $totalStock,
    ]);
}
    // ================================================================
    //  SHOW
    // ================================================================

    public function show($id)
{
    $product  = Product::findOrFail($id);
    $products = Product::orderBy('id', 'desc')->get();

    $locations    = collect();
    $transactions = collect();
    try {
        $histories = \App\Models\History::where('module', 'product')
                    ->where('record_id', $product->id)
                    ->with('user')
                    ->orderBy('created_at', 'desc')
                    ->get();
    } catch (\Exception $e) {
        $histories = collect();
    }

    try {
        $settingRow = \App\Models\SettingHandle::where('category_name', 'products')->first();
        $settings   = $settingRow ? ($settingRow->config ?? []) : [];
    } catch (\Exception $e) {
        $settings = [];
    }

    // ✅ NEW: variant query param handle
    $variantName     = request()->query('variant');
    $selectedVariant = null;

    if ($variantName && $product->variants_data) {
        $variantsData = is_string($product->variants_data)
            ? json_decode($product->variants_data, true)
            : $product->variants_data;

        foreach (($variantsData['variants'] ?? []) as $v) {
            if ($v['name'] === $variantName) {
                $selectedVariant = $v;
                break;
            }
        }
    }

    $stockLocations = Location::orderBy('location_name')->get()
        ->map(function ($location) use ($product) {
            $stock = \App\Models\Stock::where('product_id', $product->id)
                ->where('location_id', $location->id)
                ->whereNull('deleted_at')
                ->first();
            return [
                'id'            => $location->id,
                'location_name' => $location->location_name,
                'location_type' => $location->location_type,
                'stock_on_hand' => $stock?->stock_on_hand ?? 0,
                'committed'     => $stock?->committed_stock ?? 0,
                'available'     => $stock?->available_stock ?? 0,
                'value_per_unit' => $stock?->value_per_unit  ?? 0,
            ];
        });

    if (request()->expectsJson()) {
        $additionalData = $product->additional_data
            ? (is_string($product->additional_data) ? json_decode($product->additional_data, true) : $product->additional_data)
            : [];

        $accountDetails = $additionalData['account_details'] ?? [];
        $descriptions   = $additionalData['description']     ?? [];

        return response()->json([
            'success' => true,
            'data'    => [
                'data' => array_merge($product->toArray(), [
                    // ── Dimensions (stored as length/width/height) ──
                    'dimension_l'    => $additionalData['length']         ?? $additionalData['dimension_l']    ?? null,
                    'dimension_w'    => $additionalData['width']          ?? $additionalData['dimension_w']    ?? null,
                    'dimension_h'    => $additionalData['height']         ?? $additionalData['dimension_h']    ?? null,
                    'dimension_unit' => $additionalData['dimension_unit'] ?? 'cm',
                    'weight'         => $additionalData['weight']         ?? null,
                    'weight_unit'    => $additionalData['weight_unit']    ?? 'kg',
                    // ── Identifiers ──
                    'upc'  => $additionalData['upc']  ?? null,
                    'mpn'  => $additionalData['mpn']  ?? null,
                    'ean'  => $additionalData['ean']  ?? null,
                    'isbn' => $additionalData['isbn'] ?? null,
                    // ── Descriptions ──
                    'description'          => $descriptions['items_description']    ?? $product->description          ?? null,
                    'sales_description'    => $descriptions['sales_description']    ?? $product->sales_description    ?? null,
                    'purchase_description' => $descriptions['purchase_description'] ?? $product->purchase_description ?? null,
                    // ── Account details ──
                    'inventory_account' => $accountDetails['inventory_account'] ?? null,
                    'preferred_vendor'  => $accountDetails['preferred_vendor']  ?? null,
                    'vendor_id'         => $accountDetails['preferred_vendor']  ?? null,
                    // ── Image URL ──
                    'front_image_url' => self::imageUrl(($product->product_image ?? [])['front_image'] ?? null),
                    'stock_locations' => $stockLocations,
                ]),
            ],
        ]);
    }

    return view('products.show', compact(
        'product', 'products', 'stockLocations',
        'locations', 'transactions', 'histories', 'settings'
    ));
}

    // ================================================================
    //  EDIT
    // ================================================================

    public function edit($id)
    {
        $operation = 'EDIT_VIEW';

        try {
            $this->logProductOperation($operation, 'Loading product edit form', ['product_id' => $id]);

            $product      = Product::findOrFail($id);
            $brands       = Brand::orderBy('name')->get();
            $customFields = \App\Models\AdditionalSetting::where('status', 'active')
                ->where('category_name', 'products')
                ->get();

            // ⭐ BUG FIX: settings pass 
            $settingRow = \App\Models\SettingHandle::where('category_name', 'products')->first();
            $settings   = $settingRow ? ($settingRow->config ?? []) : [];

            $this->logProductOperation($operation, 'Product edit form loaded', [
                'product_id'   => $id,
                'product_name' => $product->name,
            ]);

            return view('products.edit', compact('product', 'brands', 'customFields', 'settings'));

        } catch (\Exception $e) {
            $this->logProductError($operation, 'Failed to load product edit form', $e, ['product_id' => $id]);
            return redirect()->route('products.index')->with('error', 'Failed to load product edit form');
        }
    }

    // ================================================================
    //  UPDATE
    // ================================================================

    public function update(Request $request, $id)
    {
        $operation = 'UPDATE';
        $startTime = microtime(true);

        try {
            $this->logProductOperation($operation, 'Starting product update', [
                'product_id'   => $id,
                'request_data' => $request->except(['front_image']),
            ]);

            $product = Product::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'name'                        => 'sometimes|required|string|max:255',
                'type'                        => 'sometimes|in:goods,service',
                'brand_id'                    => 'nullable|exists:brands,id',
                'item_variant_type'           => 'sometimes|in:single,contains_variants',
                'unit'                        => 'sometimes|required|string|max:50',
                'sku'                         => ['nullable', 'string', Rule::unique('products', 'sku')->ignore($id)->whereNull('deleted_at')],
                'selling_price'               => 'nullable|numeric|min:0',
                'cost_price'                  => 'nullable|numeric|min:0',
                'items_description'           => 'nullable|string',
                'sales_description'           => 'nullable|string',
                'purchase_description'        => 'nullable|string',
                'track_inventory'             => 'boolean',
                'bin_location_tracking'       => 'boolean',
                'inventory_valuation_method'  => 'nullable|in:FIFO,Weighted Average',
                'reorder_point'               => 'nullable|numeric|min:0',
                'is_returnable'               => 'boolean',
                'custom_field'                => 'nullable|array',
                'custom_field.length'         => 'nullable|numeric',
                'custom_field.width'          => 'nullable|numeric',
                'custom_field.height'         => 'nullable|numeric',
                'custom_field.dimension_unit' => 'nullable|in:cm,m,in,ft,mm',
                'custom_field.weight'         => 'nullable|numeric',
                'custom_field.weight_unit'    => 'nullable|in:kg,g,lb,oz,mg',
                'front_image'                 => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
                'remove_front_image'          => 'nullable|boolean',
                'additional_fields'           => 'nullable|array',
            ]);

            if ($validator->fails()) {
                if ($request->expectsJson()) {
                    return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
                }
                return redirect()->back()->withErrors($validator)->withInput();
            }

            DB::beginTransaction();

            $brandName = $product->brand;
            if ($request->has('brand_id')) {
                if ($request->brand_id) {
                    $brand     = Brand::find($request->brand_id);
                    $brandName = $brand ? $brand->name : null;
                } else {
                    $brandName = null;
                }
            }

            $existingImageData = json_decode($product->product_image, true) ?? [];
            $frontImagePath    = $existingImageData['front_image'] ?? null;

            if ($request->boolean('remove_front_image') && $frontImagePath) {
                $this->deleteImage($frontImagePath);
                $frontImagePath = null;
            }

            if ($request->hasFile('front_image')) {
                if ($frontImagePath) $this->deleteImage($frontImagePath);
                $frontImagePath = $this->uploadImage($request->file('front_image'));
            }

            $existingAdditional = json_decode($product->additional_data ?? '{}', true) ?? [];

            $sanitized = $this->sanitizeProductData([
                'name'                       => $request->name                       ?? $product->name,
                'type'                       => $request->type                       ?? $product->type,
                'brand_id'                   => $request->brand_id                   ?? $product->brand_id,
                'item_variant_type'          => $request->item_variant_type          ?? $product->item_variant_type,
                'unit'                       => $request->unit                       ?? $product->unit,
                'sku'                        => $request->sku                        ?? $product->sku,
                'selling_price'              => $request->selling_price              ?? $product->selling_price,
                'cost_price'                 => $request->cost_price                 ?? $product->cost_price,
                'track_inventory'            => $request->track_inventory            ?? $product->track_inventory,
                'bin_location_tracking'      => $request->bin_location_tracking      ?? $product->bin_location_tracking,
                'inventory_valuation_method' => $request->inventory_valuation_method ?? $product->inventory_valuation_method,
                'reorder_point'              => $request->reorder_point              ?? $product->reorder_point,
                'is_returnable'              => $request->is_returnable              ?? $product->is_returnable,
            ]);

            $newCf         = $this->sanitizeCustomField(array_merge($existingAdditional, $request->input('custom_field', [])));
            $newAdditional = $this->resolveAdditionalFields($request->input('additional_fields', []));

            $updateData = array_merge($sanitized, [
                'brand'           => $brandName,
                'product_image'   => json_encode(['front_image' => $frontImagePath]),
                'additional_data' => json_encode(array_merge(
                    $newCf,
                    $newAdditional,
                    [
                        'upc'  => $request->upc  ?? $existingAdditional['upc']  ?? null,
                        'mpn'  => $request->mpn  ?? $existingAdditional['mpn']  ?? null,
                        'ean'  => $request->ean  ?? $existingAdditional['ean']  ?? null,
                        'isbn' => $request->isbn ?? $existingAdditional['isbn'] ?? null,
                    ],
                    [
                        'account_details' => [
                            'inventory_account' => $request->inventory_account_id
                                ?? $existingAdditional['account_details']['inventory_account'] ?? null,
                            'preferred_vendor'  => $request->preferred_vendor_id
                                ?? $existingAdditional['account_details']['preferred_vendor']  ?? null,
                        ],
                    ],
                    $this->buildDescriptionData($request, $existingAdditional),
                    // ⭐ category update — 
                [
                    'category' => [
                        'id'   => $request->category_id
                            ? (int)$request->category_id
                            : ($existingAdditional['category']['id']   ?? null),
                        'name' => $request->category_name
                            ?? ($existingAdditional['category']['name'] ?? null),
                    ],
                ]
                )),
            ]);

            $product->update($updateData);

            DB::commit();

            $this->clearProductCache($id);

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            $this->logProductOperation($operation, 'Product updated successfully', [
                'product_id'        => $id,
                'execution_time_ms' => $executionTime,
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Product updated successfully',
                    'data'    => $product,
                    'meta'    => ['execution_time_ms' => $executionTime],
                ]);
            }

            return redirect()->route('products.index')->with('success', 'Product updated successfully!');

        } catch (\Exception $e) {
            DB::rollBack();

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            $this->logProductError($operation, 'Failed to update product', $e, [
                'product_id'        => $id,
                'execution_time_ms' => $executionTime,
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update product',
                    'error'   => config('app.debug') ? $e->getMessage() : 'Internal server error',
                ], 500);
            }

            return redirect()->back()
                ->with('error', 'Failed to update product: ' . $e->getMessage())
                ->withInput();
        }
    }

    // ================================================================
    //  RESOLVE ADDITIONAL FIELDS
    // ================================================================

    private function resolveAdditionalFields(array $rawFields): array
    {
        if (empty($rawFields)) return [];

        $fieldIds = array_keys($rawFields);

        $fields = \App\Models\AdditionalSetting::whereIn('id', $fieldIds)
            ->pluck('name', 'id');

        $resolved = [];
        foreach ($rawFields as $fieldId => $value) {
            $fieldName      = $fields[$fieldId] ?? 'field_' . $fieldId;
            $key            = strtolower(str_replace(' ', '_', $fieldName));
            $resolved[$key] = $value;
        }

        return $resolved;
    }

    // ================================================================
    //  DESTROY
    // ================================================================

    public function destroy($id)
    {
        $operation = 'DESTROY';
        $startTime = microtime(true);

        try {
            $this->logProductOperation($operation, 'Starting product deletion', ['product_id' => $id]);

            $product     = Product::findOrFail($id);
            $productName = $product->name;
            $productSku  = $product->sku;

            DB::beginTransaction();

            $frontImage = json_decode($product->product_image, true)['front_image'] ?? null;
            if ($frontImage) $this->deleteImage($frontImage);

            $product->delete();

            DB::commit();

            $this->clearProductCache($id);

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            $this->logProductOperation($operation, 'Product deleted successfully', [
                'product_id'        => $id,
                'product_name'      => $productName,
                'sku'               => $productSku,
                'execution_time_ms' => $executionTime,
            ]);

            if (request()->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Product deleted successfully',
                    'meta'    => ['execution_time_ms' => $executionTime],
                ]);
            }

            return redirect()->route('products.index')->with('success', 'Product deleted successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            $this->logProductError($operation, 'Failed to delete product', $e, [
                'product_id'        => $id,
                'execution_time_ms' => $executionTime,
            ]);

            if (request()->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to delete product',
                    'error'   => config('app.debug') ? $e->getMessage() : 'Internal server error',
                ]);
            }

            return redirect()->back()->with('error', 'Failed to delete product: ' . $e->getMessage());
        }
    }

    // ================================================================
    //  RESTORE
    // ================================================================

    public function restore($id)
    {
        $operation = 'RESTORE';
        $startTime = microtime(true);

        try {
            $this->logProductOperation($operation, 'Starting product restoration', ['product_id' => $id]);

            DB::beginTransaction();

            $product     = Product::withTrashed()->findOrFail($id);
            $productName = $product->name;
            $productSku  = $product->sku;

            $product->restore();

            DB::commit();

            $this->clearProductCache($id);

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            $this->logProductOperation($operation, 'Product restored successfully', [
                'product_id'        => $id,
                'product_name'      => $productName,
                'sku'               => $productSku,
                'execution_time_ms' => $executionTime,
            ]);

            if (request()->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Product restored successfully',
                    'meta'    => ['execution_time_ms' => $executionTime],
                ]);
            }

            return redirect()->route('products.index')->with('success', 'Product restored successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            $this->logProductError($operation, 'Failed to restore product', $e, [
                'product_id'        => $id,
                'execution_time_ms' => $executionTime,
            ]);

            if (request()->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to restore product',
                    'error'   => config('app.debug') ? $e->getMessage() : 'Internal server error',
                ]);
            }

            return redirect()->back()->with('error', 'Failed to restore product: ' . $e->getMessage());
        }
    }
}