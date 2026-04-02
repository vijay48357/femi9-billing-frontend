<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Stock extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'product_id',
        'location_id',
        'stock_on_hand',
        'committed_stock',
        'available_stock',
        'value_per_unit',
    ];
}
