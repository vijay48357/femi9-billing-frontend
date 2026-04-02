<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class LockConfiguration extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'lock_configuration';

    protected $fillable = [
        'name',
        'description',
        'module',
        'action_type',
        'selected_actions',
        'field_type',
        'selected_fields',
        'lock_for_type',
        'roles',
        'status',
    ];

    protected $casts = [
        'selected_actions' => 'array',
        'selected_fields'  => 'array',
        'roles'            => 'array',
    ];

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForModule($query, string $module)
    {
        return $query->where('module', $module);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Check if this config applies to a given role
     */
    public function appliesToRole(string $role): bool
    {
        return match ($this->lock_for_type) {
            'all_roles'        => true,
            'all_roles_except' => !in_array($role, $this->roles ?? []),
            'selected_roles'   => in_array($role, $this->roles ?? []),
            default            => false,
        };
    }

    /**
     * Is Edit restricted for this role?
     */
    public function isEditRestricted(string $role): bool
    {
        if (!$this->appliesToRole($role)) return false;

        return match ($this->action_type) {
            'restrict_all'      => true,
            'restrict_selected' => in_array('Edit', $this->selected_actions ?? []),
            default             => false,
        };
    }

    /**
     * Is Delete restricted for this role?
     */
    public function isDeleteRestricted(string $role): bool
    {
        if (!$this->appliesToRole($role)) return false;

        return match ($this->action_type) {
            'restrict_all'      => true,
            'restrict_selected' => in_array('Delete', $this->selected_actions ?? []),
            default             => false,
        };
    }

    /**
     * Is this field allowed for a given role?
     */
    public function isFieldAllowed(string $field, string $role): bool
    {
        if (!$this->appliesToRole($role)) return true;

        return match ($this->field_type) {
            'restrict_all'      => false,
            'restrict_selected' => !in_array($field, $this->selected_fields ?? []),
            'allow_selected'    => in_array($field, $this->selected_fields ?? []),
            default             => true,
        };
    }

    // ── Label Helpers (for Blade views) ───────────────────────────────────────

    public function getActionTypeLabelAttribute(): string
    {
        return match ($this->action_type) {
            'restrict_all'      => 'Restrict All Actions',
            'restrict_selected' => 'Restrict Selected Actions',
            'allow_selected'    => 'Allow Selected Actions',
            default             => $this->action_type,
        };
    }

    public function getFieldTypeLabelAttribute(): string
    {
        return match ($this->field_type) {
            'restrict_all'      => 'Restrict All Fields',
            'restrict_selected' => 'Restrict Selected Fields',
            'allow_selected'    => 'Allow Selected Fields',
            default             => $this->field_type,
        };
    }

    public function getLockForTypeLabelAttribute(): string
    {
        return match ($this->lock_for_type) {
            'all_roles'        => 'All Roles',
            'all_roles_except' => 'All Roles Except',
            'selected_roles'   => 'Selected Roles',
            default            => $this->lock_for_type,
        };
    }
}