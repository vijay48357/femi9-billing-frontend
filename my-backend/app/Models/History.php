<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class History extends Model
{
    protected $table = 'histories';

    protected $fillable = [
        'module',
        'action',
        'record_id',
        'user_id',
        'old_data',
        'new_data',
    ];

    public function user()
{
    return $this->belongsTo(\App\Models\User::class, 'user_id');
}
    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
    ];
}