<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

   public function up(): void
{
    Schema::create('locations', function (Blueprint $table) {
        $table->id();
        $table->enum('location_type', ['business', 'warehouse'])->default('business');
        $table->string('location_name');
        $table->boolean('is_child')->default(false);          
        $table->unsignedBigInteger('parent_location_id')->nullable(); 
        $table->json('address_details')->nullable();
        $table->json('additional_data')->nullable();
        $table->timestamps();
        $table->softDeletes();

        // Foreign key separately
        $table->foreign('parent_location_id')
              ->references('id')
              ->on('locations')
              ->nullOnDelete();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};