<?php

namespace App\Http\Controllers;

use App\Models\SettingHandle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SettingHandleController extends Controller
{
    // ✅ GET /api/product-preferences
    public function index()
    {
        try {
            $setting = SettingHandle::where('process', 'general_preferences')->first();
            return response()->json([
                'success' => true,
                'data'    => $setting ? $setting->config : null,
            ]);
        } catch (\Exception $e) {
            Log::error('SettingHandleController@index: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to load preferences.'], 500);
        }
    }

    // ✅ POST /api/product-preferences
    public function store(Request $request)
    {
        try {
            $setting = SettingHandle::updateOrCreate(
                ['process' => 'general_preferences'],
                ['config'  => $request->all()]
            );
            return response()->json([
                'success' => true,
                'data'    => $setting->config,
            ]);
        } catch (\Exception $e) {
            Log::error('SettingHandleController@store: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to save preferences.'], 500);
        }
    }

    // ✅ DELETE /api/product-preferences
    public function destroy()
    {
        try {
            $setting = SettingHandle::where('process', 'general_preferences')->first();
            if ($setting) {
                $setting->delete();
                return response()->json(['success' => true, 'message' => 'Preferences deleted.']);
            }
            return response()->json(['success' => false, 'message' => 'No preferences found.'], 404);
        } catch (\Exception $e) {
            Log::error('SettingHandleController@destroy: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to delete.'], 500);
        }
    }
}