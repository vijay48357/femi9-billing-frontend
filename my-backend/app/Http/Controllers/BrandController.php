<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

class BrandController extends Controller
{
    /**
     * Log channel for brand operations
     */
    protected $logChannel = 'brand';

    // ================================================================
    //  CONSTRUCTOR - Initialize logging
    // ================================================================
    
    public function __construct()
    {
        try {
            // Set up custom log channel for brands
            Log::build([
                'driver' => 'single',
                'path' => storage_path('logs/brands.log'),
                'level' => env('LOG_LEVEL', 'debug'),
            ]);
        } catch (Exception $e) {
            // Fallback to default log if custom channel fails
            Log::warning('Failed to create brand log channel: ' . $e->getMessage());
        }
    }

    // ================================================================
    //  LOGGING HELPERS
    // ================================================================

    /**
     * Log brand operation with context
     */
    private function logOperation($operation, $message, $context = [], $level = 'info')
    {
        try {
            $context = array_merge([
                'user_id' => auth()->id(),
                'user_email' => auth()->user()->email ?? 'system',
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'timestamp' => now()->toDateTimeString(),
            ], $context);

            // Try to log to custom channel, fallback to default
            try {
                Log::channel($this->logChannel)->$level("[BRAND] [{$operation}] {$message}", $context);
            } catch (Exception $e) {
                Log::$level("[BrandController:{$operation}] {$message}", $context);
            }
            
        } catch (Exception $e) {
            // Last resort - don't let logging break the application
            Log::error('Logging failed in BrandController: ' . $e->getMessage());
        }
    }

    /**
     * Log error with exception details
     */
    private function logError($operation, $message, $exception, $context = [])
    {
        try {
            $context = array_merge([
                'exception_message' => $exception->getMessage(),
                'exception_code' => $exception->getCode(),
                'exception_file' => $exception->getFile(),
                'exception_line' => $exception->getLine(),
                'exception_trace' => $exception->getTraceAsString(),
            ], $context);

            $this->logOperation($operation, $message, $context, 'error');
            
            // Report to Laravel's error handler
            try {
                report($exception);
            } catch (Exception $e) {
                // Ignore reporting errors
            }
            
        } catch (Exception $e) {
            // Silent fail - don't let error logging break the application
        }
    }

    // ================================================================
    //  INDEX
    // ================================================================
   
    public function index(Request $request)
    {
        $operation = 'INDEX';
        $startTime = microtime(true);
        
        try {
            $this->logOperation($operation, 'Starting brand listing', [
                'request_type' => $request->wantsJson() ? 'JSON' : 'AJAX',
                'request_params' => $request->all()
            ]);

            // For AJAX request from modal
            if ($request->wantsJson() || $request->ajax()) {
                try {
                    $brands = Brand::orderBy('name')->get(['id', 'name']);
                    
                    $executionTime = round((microtime(true) - $startTime) * 1000, 2);
                    
                    $this->logOperation($operation, 'Brands retrieved successfully for AJAX', [
                        'count' => $brands->count(),
                        'execution_time_ms' => $executionTime
                    ]);

                    return response()->json([
                        'success' => true, 
                        'data' => $brands
                    ]);
                    
                } catch (Exception $e) {
                    $this->logError($operation, 'Failed to retrieve brands for AJAX', $e);
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to retrieve brands',
                        'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
                    ], 500);
                }
            }

            // Regular request (if any) - currently returns JSON as well
            try {
                $brands = Brand::orderBy('name')->get();
                
                $executionTime = round((microtime(true) - $startTime) * 1000, 2);
                
                $this->logOperation($operation, 'Brands retrieved successfully', [
                    'count' => $brands->count(),
                    'execution_time_ms' => $executionTime
                ]);

                return response()->json([
                    'success' => true, 
                    'data' => $brands
                ]);
                
            } catch (Exception $e) {
                $this->logError($operation, 'Failed to retrieve brands', $e);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to retrieve brands',
                    'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
                ], 500);
            }

        } catch (Exception $e) {
            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            
            $this->logError($operation, 'Unexpected error in index method', $e, [
                'execution_time_ms' => $executionTime
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // ================================================================
    //  STORE (Quick Add)
    // ================================================================

    /**
     * New brand add (AJAX) - This handles both quickAdd and store
     */
    public function store(Request $request)
    {
        $operation = 'STORE';
        $startTime = microtime(true);
        
        try {
            $this->logOperation($operation, 'Starting brand creation', [
                'request_data' => $request->all()
            ]);

            // ── Validation ──────────────────────────────────────────
            try {
                $validator = Validator::make($request->all(), [
                    'name' => 'required|string|max:255|unique:brands,name',
                ]);

                if ($validator->fails()) {
                    $errors = $validator->errors();
                    
                    $this->logOperation($operation, 'Validation failed', [
                        'errors' => $errors->toArray()
                    ], 'warning');

                    return response()->json([
                        'success' => false,
                        'message' => $errors->first('name')
                    ], 422);
                }

                $this->logOperation($operation, 'Validation passed');

            } catch (Exception $e) {
                $this->logError($operation, 'Validation process failed', $e);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed: ' . ($e->getMessage())
                ], 422);
            }

            DB::beginTransaction();
            $this->logOperation($operation, 'Database transaction started');

            // ── Create Brand ────────────────────────────────────────
            try {
                $brand = Brand::create([
                    'name' => trim($request->name)
                ]);

                $this->logOperation($operation, 'Brand created in database', [
                    'brand_id' => $brand->id,
                    'brand_name' => $brand->name
                ]);

            } catch (Exception $e) {
                DB::rollBack();
                $this->logError($operation, 'Failed to create brand in database', $e, [
                    'name' => $request->name
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create brand: ' . $e->getMessage()
                ], 500);
            }

            DB::commit();
            $this->logOperation($operation, 'Database transaction committed', [
                'brand_id' => $brand->id
            ]);

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);

            $this->logOperation($operation, 'Brand created successfully', [
                'brand_id' => $brand->id,
                'brand_name' => $brand->name,
                'execution_time_ms' => $executionTime
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Brand added successfully',
                'data' => [
                    'id' => $brand->id,
                    'name' => $brand->name
                ]
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();
            
            $executionTime = round((microtime(true) - $startTime) * 1000, 2);

            $this->logError($operation, 'Unexpected error in brand creation', $e, [
                'execution_time_ms' => $executionTime,
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to add brand. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // ================================================================
    //  UPDATE
    // ================================================================

    /**
     * Update the specified brand in storage.
     */
    public function update(Request $request, $id)
    {
        $operation = 'UPDATE';
        $startTime = microtime(true);
        
        try {
            $this->logOperation($operation, 'Starting brand update', [
                'brand_id' => $id,
                'request_data' => $request->all()
            ]);

            // ── Find Brand ─────────────────────────────────────────
            try {
                $brand = Brand::findOrFail($id);
                
                $this->logOperation($operation, 'Brand found', [
                    'brand_id' => $id,
                    'brand_name' => $brand->name
                ]);

            } catch (Exception $e) {
                $this->logError($operation, 'Brand not found', $e, [
                    'brand_id' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Brand not found'
                ], 404);
            }

            // ── Validation ──────────────────────────────────────────
            try {
                $validator = Validator::make($request->all(), [
                    'name' => 'required|string|max:255|unique:brands,name,' . $id
                ]);

                if ($validator->fails()) {
                    $errors = $validator->errors();
                    
                    $this->logOperation($operation, 'Validation failed', [
                        'brand_id' => $id,
                        'errors' => $errors->toArray()
                    ], 'warning');

                    return response()->json([
                        'success' => false,
                        'message' => $errors->first('name')
                    ], 422);
                }

                $this->logOperation($operation, 'Validation passed', [
                    'brand_id' => $id
                ]);

            } catch (Exception $e) {
                $this->logError($operation, 'Validation process failed', $e, [
                    'brand_id' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed: ' . $e->getMessage()
                ], 422);
            }

            DB::beginTransaction();
            $this->logOperation($operation, 'Database transaction started', [
                'brand_id' => $id
            ]);

            // ── Store old data for logging ──────────────────────────
            $oldName = $brand->name;

            // ── Update Brand ────────────────────────────────────────
            try {
                $brand->update([
                    'name' => trim($request->name)
                ]);

                $this->logOperation($operation, 'Brand updated in database', [
                    'brand_id' => $id,
                    'old_name' => $oldName,
                    'new_name' => $brand->name
                ]);

            } catch (Exception $e) {
                DB::rollBack();
                $this->logError($operation, 'Failed to update brand in database', $e, [
                    'brand_id' => $id,
                    'name' => $request->name
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update brand: ' . $e->getMessage()
                ], 500);
            }

            DB::commit();
            $this->logOperation($operation, 'Database transaction committed', [
                'brand_id' => $id
            ]);

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);

            $this->logOperation($operation, 'Brand updated successfully', [
                'brand_id' => $id,
                'old_name' => $oldName,
                'new_name' => $brand->name,
                'execution_time_ms' => $executionTime
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Brand updated successfully',
                'data' => [
                    'id' => $brand->id,
                    'name' => $brand->name
                ]
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            
            $executionTime = round((microtime(true) - $startTime) * 1000, 2);

            $this->logError($operation, 'Unexpected error in brand update', $e, [
                'brand_id' => $id,
                'execution_time_ms' => $executionTime,
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update brand. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // ================================================================
    //  DESTROY
    // ================================================================

    /**
     * Brand delete
     */
    public function destroy($id)
    {
        $operation = 'DESTROY';
        $startTime = microtime(true);
        
        try {
            $this->logOperation($operation, 'Starting brand deletion', [
                'brand_id' => $id
            ]);

            // ── Find Brand ─────────────────────────────────────────
            try {
                $brand = Brand::findOrFail($id);
                
                $this->logOperation($operation, 'Brand found', [
                    'brand_id' => $id,
                    'brand_name' => $brand->name
                ]);

            } catch (Exception $e) {
                $this->logError($operation, 'Brand not found for deletion', $e, [
                    'brand_id' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Brand not found'
                ], 404);
            }

            DB::beginTransaction();
            $this->logOperation($operation, 'Database transaction started', [
                'brand_id' => $id
            ]);

            // ── Check if brand has products ─────────────────────────
            try {
                if ($brand->products()->exists()) {
                    $productsCount = $brand->products()->count();
                    
                    $this->logOperation($operation, 'Cannot delete brand with associated products', [
                        'brand_id' => $id,
                        'brand_name' => $brand->name,
                        'products_count' => $productsCount
                    ], 'warning');

                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot delete brand with associated products'
                    ], 422);
                }

                $this->logOperation($operation, 'No associated products found', [
                    'brand_id' => $id
                ]);

            } catch (Exception $e) {
                DB::rollBack();
                $this->logError($operation, 'Failed to check brand products', $e, [
                    'brand_id' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to verify brand associations: ' . $e->getMessage()
                ], 500);
            }

            // ── Delete Brand ────────────────────────────────────────
            try {
                $brandName = $brand->name;
                $brand->delete();

                $this->logOperation($operation, 'Brand deleted from database', [
                    'brand_id' => $id,
                    'brand_name' => $brandName
                ]);

            } catch (Exception $e) {
                DB::rollBack();
                $this->logError($operation, 'Failed to delete brand from database', $e, [
                    'brand_id' => $id
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to delete brand: ' . $e->getMessage()
                ], 500);
            }

            DB::commit();
            $this->logOperation($operation, 'Database transaction committed', [
                'brand_id' => $id
            ]);

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);

            $this->logOperation($operation, 'Brand deleted successfully', [
                'brand_id' => $id,
                'brand_name' => $brandName,
                'execution_time_ms' => $executionTime
            ]);

            return response()->json([
                'success' => true, 
                'message' => 'Brand deleted successfully'
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            
            $executionTime = round((microtime(true) - $startTime) * 1000, 2);

            $this->logError($operation, 'Unexpected error in brand deletion', $e, [
                'brand_id' => $id,
                'execution_time_ms' => $executionTime
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete brand. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // ================================================================
    //  GET LIST
    // ================================================================

    /**
     * Get brands list for dropdown (specific for AJAX)
     */
    public function getList()
    {
        $operation = 'GET_LIST';
        $startTime = microtime(true);
        
        try {
            $this->logOperation($operation, 'Starting brand list fetch for dropdown');

            try {
                $brands = Brand::orderBy('name')->get(['id', 'name']);
                
                $executionTime = round((microtime(true) - $startTime) * 1000, 2);

                $this->logOperation($operation, 'Brand list fetched successfully for dropdown', [
                    'count' => $brands->count(),
                    'execution_time_ms' => $executionTime
                ]);

                return response()->json([
                    'success' => true,
                    'data' => $brands
                ]);

            } catch (Exception $e) {
                $this->logError($operation, 'Failed to fetch brand list', $e);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch brand list',
                    'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
                ], 500);
            }

        } catch (Exception $e) {
            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            
            $this->logError($operation, 'Unexpected error in getList method', $e, [
                'execution_time_ms' => $executionTime
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    // ================================================================
    //  ADDITIONAL HELPER METHODS
    // ================================================================

    /**
     * Get brand by ID with error handling
     */
    public function getById($id)
    {
        $operation = 'GET_BY_ID';
        
        try {
            $this->logOperation($operation, 'Fetching brand by ID', [
                'brand_id' => $id
            ]);

            $brand = Brand::findOrFail($id);

            $this->logOperation($operation, 'Brand found', [
                'brand_id' => $id,
                'brand_name' => $brand->name
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $brand->id,
                    'name' => $brand->name
                ]
            ]);

        } catch (Exception $e) {
            $this->logError($operation, 'Failed to fetch brand by ID', $e, [
                'brand_id' => $id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Brand not found'
            ], 404);
        }
    }

    /**
     * Bulk delete brands
     */
    public function bulkDestroy(Request $request)
    {
        $operation = 'BULK_DESTROY';
        $startTime = microtime(true);
        
        try {
            $this->logOperation($operation, 'Starting bulk brand deletion', [
                'ids' => $request->input('ids', [])
            ]);

            $ids = $request->input('ids', []);
            
            if (empty($ids)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No brands selected for deletion'
                ], 422);
            }

            DB::beginTransaction();
            $this->logOperation($operation, 'Database transaction started');

            $deleted = 0;
            $failed = 0;
            $errors = [];

            foreach ($ids as $id) {
                try {
                    $brand = Brand::find($id);
                    
                    if (!$brand) {
                        $failed++;
                        $errors[] = "Brand ID {$id} not found";
                        continue;
                    }

                    if ($brand->products()->exists()) {
                        $failed++;
                        $errors[] = "Brand '{$brand->name}' has associated products";
                        continue;
                    }

                    $brand->delete();
                    $deleted++;

                } catch (Exception $e) {
                    $failed++;
                    $errors[] = "Failed to delete brand ID {$id}: " . $e->getMessage();
                    
                    $this->logError($operation, 'Error deleting individual brand', $e, [
                        'brand_id' => $id
                    ]);
                }
            }

            if ($deleted > 0) {
                DB::commit();
                
                $executionTime = round((microtime(true) - $startTime) * 1000, 2);

                $this->logOperation($operation, 'Bulk deletion completed', [
                    'deleted_count' => $deleted,
                    'failed_count' => $failed,
                    'execution_time_ms' => $executionTime
                ]);

                return response()->json([
                    'success' => true,
                    'message' => "Successfully deleted {$deleted} brands. Failed: {$failed}",
                    'data' => [
                        'deleted' => $deleted,
                        'failed' => $failed,
                        'errors' => $errors
                    ]
                ]);

            } else {
                DB::rollBack();
                
                return response()->json([
                    'success' => false,
                    'message' => 'No brands were deleted',
                    'data' => [
                        'errors' => $errors
                    ]
                ], 422);
            }

        } catch (Exception $e) {
            DB::rollBack();
            
            $executionTime = round((microtime(true) - $startTime) * 1000, 2);

            $this->logError($operation, 'Unexpected error in bulk deletion', $e, [
                'execution_time_ms' => $executionTime
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete brands',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}