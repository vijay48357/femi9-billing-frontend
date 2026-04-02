<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SettingHandle extends Model {
    use SoftDeletes;

    protected $table = 'setting_handle';

    protected $fillable = ['process', 'config'];

    protected $casts = ['config' => 'array'];
}