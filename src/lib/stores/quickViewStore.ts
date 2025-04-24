// src/lib/stores/quickViewStore.ts
import { writable } from 'svelte/store';

// --- INTERFACE: Describes the data needed for the modal ---
// *** VERIFY/ADAPT THIS in your actual src/lib/types.ts ***
export interface QuickViewProduct {
    id: string | number; // Matches your products.id type (uuid -> string usually)
    name: string;        // Matches products.name
    price: number;       // Matches products.price
    images: string[];    // <<< CRITICAL: Matches products.images (text[])
    currency?: string;   // Optional: Add 'شيكل' or fetch if available
    description?: string | null; // Optional: Matches products.description
    // Add any other fields needed for the modal view
}

// --- The Store ---
// Holds either the product data (if modal is open) or null (if closed).
export const quickViewProduct = writable<QuickViewProduct | null>(null);

// --- Helper Functions ---
// Call this function from ProductCard when clicked
export function openQuickView(productData: QuickViewProduct) {
    // Basic check to ensure we have an images array
    if (!productData || !Array.isArray(productData.images)) {
         console.error("Error: Product data passed to openQuickView is missing a valid 'images' array.", productData);
         // Set images to empty array as a fallback to prevent errors later
         productData.images = [];
    }
    quickViewProduct.set(productData); // Put the product data onto the 'signal board'
}

// Call this function to close the modal (e.g., from close button)
export function closeQuickView() {
    quickViewProduct.set(null); // Clear the 'signal board'
}