<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ✅ Table already exists check — error 
        if (Schema::hasTable('additional_setting')) {
            return;
        }

        Schema::create('additional_setting', function (Blueprint $table) {
            $table->id();
            $table->string('name');

            // ✅ enum  string — React values match 
            $table->string('data_type', 100)->default('Text Box (Single Line)');

            // ✅ enum('yes','no')  string — Controller 'Yes'/'No' expect
            $table->string('mandatory', 10)->default('No');

            // ✅ enum('active','inactive')  string — Controller 'Active'/'Inactive' expect
            $table->string('status', 20)->default('Active');

            $table->json('additional_config')->nullable()->comment('JSON field for configuration data');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('additional_setting');
    }
};