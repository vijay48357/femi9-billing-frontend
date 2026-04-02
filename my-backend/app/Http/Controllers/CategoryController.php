<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function list()
    {
        $categories = Category::with('parent')
            ->orderBy('name')
            ->get()
            ->map(fn($c) => [
                'id'          => $c->id,
                'name'        => $c->name,
                'parent_id'   => $c->parent_id,
                'parent_name' => $c->parent?->name,
                'full_name'   => $c->parent
                    ? $c->parent->name . ' > ' . $c->name
                    : $c->name,
            ]);

        return response()->json(['success' => true, 'data' => $categories]);
    }

    // ── STORE — new category add ──────────────────────────────
    public function store(Request $request)
    {
        $request->validate([
            'name'      => 'required|string|max:255',
            'parent_id' => 'nullable|exists:categories,id',
        ]);

        $exists = Category::where('name', trim($request->name))
            ->where('parent_id', $request->parent_id ?: null)
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Category already exists.',
            ], 422);
        }

        $category = Category::create([
            'name'      => trim($request->name),
            'parent_id' => $request->parent_id ?: null,
        ]);

        $category->load('parent');

        return response()->json([
            'success' => true,
            'message' => 'Category added successfully.',
            'data'    => [
                'id'          => $category->id,
                'name'        => $category->name,
                'parent_id'   => $category->parent_id,
                'parent_name' => $category->parent?->name,
                'full_name'   => $category->parent
                    ? $category->parent->name . ' > ' . $category->name
                    : $category->name,
            ],
        ], 201);
    }

    // ── UPDATE — edit category ────────────────────────────────
    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $request->validate([
            'name'      => 'required|string|max:255',
            'parent_id' => 'nullable|exists:categories,id',
        ]);

        if ($request->parent_id == $id) {
            return response()->json([
                'success' => false,
                'message' => 'Category cannot be its own parent.',
            ], 422);
        }

        $category->update([
            'name'      => trim($request->name),
            'parent_id' => $request->parent_id ?: null,
        ]);

        $category->load('parent');

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully.',
            'data'    => [
                'id'          => $category->id,
                'name'        => $category->name,
                'parent_id'   => $category->parent_id,
                'parent_name' => $category->parent?->name,
                'full_name'   => $category->parent
                    ? $category->parent->name . ' > ' . $category->name
                    : $category->name,
            ],
        ]);
    }

    // ── DESTROY — delete category ─────────────────────────────
    public function destroy($id)
    {
        $category = Category::findOrFail($id);

        Category::where('parent_id', $id)->update(['parent_id' => null]);

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully.',
        ]);
    }
}