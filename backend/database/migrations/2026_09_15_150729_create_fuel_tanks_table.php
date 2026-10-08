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
        Schema::create('fuel_tanks', function (Blueprint $table) {
    $table->id();
    $table->string('tank_number')->unique(); // . TK_001
    $table->string('fuel_type'); // Diesel, Petrol92, Petrol95
    $table->decimal('capacity', 10, 2)->default(0);
    $table->decimal('current_volume', 10, 2)->default(0);
    $table->decimal('min_volume', 10, 2)->default(0);
    $table->string('status')->default('Active');
    $table->string('location')->nullable();
    $table->date('inspected_at')->nullable();
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fuel_tanks');
    }
};
