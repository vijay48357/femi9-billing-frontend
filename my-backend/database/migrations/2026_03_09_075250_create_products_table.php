<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            // ── Basic Info ──────────────────────────────────────────
            $table->string('name');
            $table->enum('type', ['goods', 'service'])->default('goods');

            // ── Product Image & Brand ───────────────────────────────
            $table->string('product_image')->nullable();
            $table->unsignedBigInteger('brand_id')->nullable();  // FK reference
            $table->string('brand')->nullable();                  // brand name (denormalized)

            // ── Item Details ────────────────────────────────────────
            $table->enum('item_variant_type', ['single', 'contains_variants'])->default('single');
            $table->string('unit');
            $table->string('sku')->nullable()->unique();

            // ── Pricing ─────────────────────────────────────────────
            $table->decimal('selling_price', 15, 2)->nullable();
            $table->decimal('cost_price', 15, 2)->nullable();

            // ── Inventory Tracking ──────────────────────────────────
            $table->boolean('track_inventory')->default(false);
            $table->boolean('bin_location_tracking')->default(false);
            $table->enum('inventory_valuation_method', ['FIFO', 'Weighted Average'])->nullable();
            $table->decimal('reorder_point', 15, 2)->nullable();
            $table->decimal('opening_stock', 15, 4)->nullable()->default(0);

            // ── Cancellation & Returns ──────────────────────────────
            $table->boolean('is_returnable')->default(true);

            // ── Additional Information ──────────────────────────────
            // Stores: custom_field (dimensions/weight), upc/mpn/ean/isbn,
            //         account_details, description (items/sales/purchase)
            $table->json('additional_data')->nullable()->comment('Custom field values, descriptions, identifiers');
            $table->json('variants_data')
                  ->nullable()
                  ->comment('Stores variant attributes and variant rows for contains_variants items');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};