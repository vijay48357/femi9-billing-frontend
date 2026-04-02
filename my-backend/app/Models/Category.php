<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'parent_id'];

    // Parent category relation
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    // Children categories relation
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }
}