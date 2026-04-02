<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lock_configuration', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();                          // Lock Configuration Name
            $table->text('description')->nullable();                   // Description
            $table->string('module')->default('items');                // items, invoices, etc.

            // Allow or Restrict Actions (from Zoho UI dropdown)
            // restrict_all | restrict_selected | allow_selected
            $table->enum('action_type', [
                'restrict_all',
                'restrict_selected',
                'allow_selected',
            ])->default('restrict_all');

            // ["Edit"] or ["Delete"] or ["Edit","Delete"]
            $table->json('selected_actions')->nullable();

            // Allow or Restrict Fields
            // restrict_all | restrict_selected | allow_selected
            $table->enum('field_type', [
                'restrict_all',
                'restrict_selected',
                'allow_selected',
            ])->default('restrict_all');

            // ["item_name","sku", ...]
            $table->json('selected_fields')->nullable();

            // Lock Records For
            // all_roles | all_roles_except | selected_roles
            $table->enum('lock_for_type', [
                'all_roles',
                'all_roles_except',
                'selected_roles',
            ])->default('all_roles');

            // ["zoho_admin", ...]
            $table->json('roles')->nullable();

            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lock_configuration');
    }
};