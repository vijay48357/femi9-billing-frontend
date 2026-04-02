<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('history', function (Blueprint $table) {
    $table->id();

    $table->string('module'); // product, invoice, etc
    $table->string('action'); // create, update, delete

    $table->unsignedBigInteger('record_id'); // product_id / invoice_id

    $table->unsignedBigInteger('user_id')->nullable(); // who did

    $table->json('old_data')->nullable(); // before change
    $table->json('new_data')->nullable(); // after change

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('history');
    }
};
