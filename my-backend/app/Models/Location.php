<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Location extends Model
{
    use SoftDeletes;

    protected $table = 'locations';

    protected $fillable = [
        'location_name',
        'location_type',
        'is_child',            // ← ADD
        'parent_location_id',  // ← ADD
        'address_details',
        'additional_data'
    ];

    protected $casts = [
        'address_details'    => 'array',
        'additional_data'       => 'array',
        'is_child'           => 'boolean', // ← ADD
    ];

    // Parent location relationship
    public function parentLocation()
    {
        return $this->belongsTo(Location::class, 'parent_location_id');
    }

    // Child locations relationship
    public function childLocations()
    {
        return $this->hasMany(Location::class, 'parent_location_id');
    }

    // Stocks relationship
    public function stocks()
    {
        return $this->hasMany(App\Models\Stock::class, 'location_id');
    }
}