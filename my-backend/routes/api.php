<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

use App\Http\Controllers\ProductController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\BinLocationController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerVendorController;
use App\Http\Controllers\UserCategoryController;
use App\Http\Controllers\SettingHandleController;
use App\Http\Controllers\FieldCustomizationController;
use App\Http\Controllers\LockConfigurationController;

/*
|--------------------------------------------------------------------------
| Health Check (No Auth Required)
|--------------------------------------------------------------------------
*/

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'message' => 'API is running']);
});

/*
|--------------------------------------------------------------------------
| Authentication Routes (No Auth Required)
|--------------------------------------------------------------------------
*/

Route::post('/login', function (Request $request) {
    // Simple test login - replace with actual auth logic
    return response()->json([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => 1,
            'name' => 'Test User',
            'email' => $request->email ?? 'test@example.com'
        ],
        'token' => 'test-token-' . time()
    ]);
});

Route::post('/logout', function () {
    return response()->json(['success' => true, 'message' => 'Logged out']);
});

Route::post('/register', function (Request $request) {
    return response()->json([
        'success' => true,
        'message' => 'User registered',
        'user' => [
            'id' => 1,
            'name' => $request->name ?? 'New User',
            'email' => $request->email ?? 'user@example.com'
        ]
    ]);
});

/*
|--------------------------------------------------------------------------
| Product Routes
|--------------------------------------------------------------------------
*/

Route::resource('products', ProductController::class);
Route::post('products/{id}/restore',               [ProductController::class, 'restore'])->name('products.restore');
Route::post('/products/{product}/opening-stock',   [ProductController::class, 'saveOpeningStock'])->name('products.opening-stock');
Route::post('/products/set-variant', function (Request $request) {
    session(['current_variant' => $request->all()]);
    return response()->json(['success' => true]);
})->name('products.set.variant');
Route::post('/products/clear-variant', function () {
    session()->forget('current_variant');
    return response()->json(['success' => true]);
})->name('products.clear.variant');

/*
|--------------------------------------------------------------------------
| Brand Routes
|--------------------------------------------------------------------------
*/

Route::get('/brands/list',      [BrandController::class, 'getList'])->name('brands.list');
Route::resource('brands', BrandController::class)->except(['show', 'edit', 'update']);
Route::get('/brands/{id}/edit', [BrandController::class, 'edit'])->name('brands.edit');
Route::put('/brands/{id}',      [BrandController::class, 'update'])->name('brands.update');

/*
|--------------------------------------------------------------------------
| Category Routes
|--------------------------------------------------------------------------
*/

Route::get('/categories/list',    [CategoryController::class, 'list']);
Route::post('/categories',        [CategoryController::class, 'store']);
Route::put('/categories/{id}',    [CategoryController::class, 'update']);
Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

/*
|--------------------------------------------------------------------------
| Location Routes
|--------------------------------------------------------------------------
*/

Route::get('/locations',              [LocationController::class, 'index'])->name('locations.index');
Route::get('/locations/create',       fn() => redirect()->route('locations.index'));
Route::get('/locations/{id}/edit',    [LocationController::class, 'edit'])->where('id', '[0-9]+')->name('locations.edit');
Route::post('/locations',             [LocationController::class, 'store'])->name('locations.store');
Route::put('/locations/{location}',   [LocationController::class, 'update'])->name('locations.update');
Route::delete('/locations/{location}',[LocationController::class, 'destroy'])->name('locations.destroy');
Route::post('/transaction-series',    [BinLocationController::class, 'storeTransSeries'])->name('transaction-series.store');

/*
|--------------------------------------------------------------------------
| Customer Routes
|--------------------------------------------------------------------------
*/

Route::resource('customers', CustomerController::class);
Route::get('/settings/preferences/contacts', [CustomerVendorController::class, 'create'])->name('customers-vendors.create');

/*
|--------------------------------------------------------------------------
| User Category Routes
|--------------------------------------------------------------------------
*/

Route::prefix('user-categories')->group(function () {
    Route::get('/',        [UserCategoryController::class, 'index']);
    Route::post('/',       [UserCategoryController::class, 'store']);
    Route::put('/{id}',    [UserCategoryController::class, 'update']);
    Route::delete('/{id}', [UserCategoryController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| Reports
|--------------------------------------------------------------------------
*/

Route::post('/reports', function (Request $request) {
    return response()->json([
        'status'     => true,
        'start_date' => $request->start_date,
        'end_date'   => $request->end_date,
        'message'    => 'Report data loaded',
    ]);
});

/*
|--------------------------------------------------------------------------
| Product Preferences (Settings) Routes
|--------------------------------------------------------------------------
*/

Route::get('/product-preferences',    [SettingHandleController::class, 'index']);
Route::post('/product-preferences',   [SettingHandleController::class, 'store']);
Route::delete('/product-preferences', [SettingHandleController::class, 'destroy']);

/*
|--------------------------------------------------------------------------
| Field Customization Routes
|--------------------------------------------------------------------------
*/

Route::get('/custom-fields', [FieldCustomizationController::class, 'index']);

Route::prefix('field_customization')->group(function () {
    Route::get('/',                        [FieldCustomizationController::class, 'index']);
    Route::post('/',                       [FieldCustomizationController::class, 'store']);
    Route::put('/{id}',                    [FieldCustomizationController::class, 'update']);
    Route::delete('/{id}',                 [FieldCustomizationController::class, 'destroy']);
    Route::patch('/{id}/toggle-status',    [FieldCustomizationController::class, 'toggleStatus']);
    Route::patch('/{id}/toggle-mandatory', [FieldCustomizationController::class, 'toggleMandatory']);
    Route::patch('/{id}/toggle-pdf',       [FieldCustomizationController::class, 'togglePdf']);
});

/*
|--------------------------------------------------------------------------
| Lock Configuration Routes
|--------------------------------------------------------------------------
*/

Route::prefix('lock_configuration')->name('lock_configuration.')->group(function () {
    Route::get('/meta',                        [LockConfigurationController::class, 'meta'])->name('meta');
    Route::get('/',                            [LockConfigurationController::class, 'index'])->name('index');
    Route::get('/create',                      [LockConfigurationController::class, 'create'])->name('create');
    Route::post('/',                           [LockConfigurationController::class, 'store'])->name('store');
    Route::get('/{lockConfiguration}/edit',    [LockConfigurationController::class, 'edit'])->name('edit');
    Route::put('/{lockConfiguration}',         [LockConfigurationController::class, 'update'])->name('update');
    Route::delete('/{lockConfiguration}',      [LockConfigurationController::class, 'destroy'])->name('destroy');
    Route::patch('/{lockConfiguration}/toggle',[LockConfigurationController::class, 'toggleStatus'])->name('toggle');
});