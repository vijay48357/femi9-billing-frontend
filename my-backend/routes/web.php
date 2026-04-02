<?php

use Illuminate\Support\Facades\Route;

// API health check
Route::get('/api/health', function () {
    return response()->json(['message' => 'Laravel API is running ✅']);
});

// Don't show anything on root - React handles it
Route::get('/', function () {
    return response()->json(['status' => 'ok'], 200);
});
