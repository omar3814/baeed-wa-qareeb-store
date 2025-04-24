// src/lib/types.ts

/**
 * Represents the structure of a Product, mirroring the 'products' table
 * and including data joined from 'categories'.
 */
export interface Product {
	id: string; // uuid from Supabase
	created_at?: string; // timestamp with time zone, optional on frontend
	name: string; // text
	description: string | null; // text, nullable
	price: number; // numeric from Supabase maps to number
	images: string[]; // text[] array from Supabase
	sizes_stock: { [size: string]: number }; // jsonb, assuming { "S": 10, "M": 5, ... }
	category_id: string | null; // uuid, nullable
	currency_symbol?: string; // Optional, if you decide to store/use it

	// Structure for joined category data from the query in +page.svelte
	// `supabase.from('products').select('*, categories ( id, name )')`
	categories?: {
		id: string;
		name: string;
	} | null;
}

/**
 * Represents the structure of a Category, mirroring the 'categories' table.
 */
export interface Category {
	id: string; // uuid
	created_at?: string; // timestamp with time zone, optional
	name: string; // text
	sort_order: number | null; // integer, nullable
}

/**
 * Represents the structure of Site Settings, mirroring the 'site_settings' table.
 */
export interface SiteSettings {
	id?: number; // bigint often maps to number unless extremely large
	updated_at?: string; // timestamp with time zone, optional
	store_name?: string | null; // text, nullable
	collection_title?: string | null; // text, nullable
	address?: string | null; // text, nullable
	working_hours?: string | null; // text, nullable
	delivery_message?: string | null; // text, nullable
	banner_image_url?: string | null; // text, nullable
	phone_number?: string | null; // text, nullable
	instagram_url?: string | null; // text, nullable
	snapchat_url?: string | null; // text, nullable
	logo_image_url?: string | null; // text, nullable
}

/**
 * Represents the structure of an item added to the shopping basket/cart.
 * Based on usage in ProductCard.svelte and basketStore.
 */
export interface BasketItem {
	productId: string; // Corresponds to Product['id']
	name: string;
	size: string;
	quantity: number;
	price: number;
	imageUrl: string | null; // Can be null if product has no image
	maxStock: number; // The available stock for the selected size
}

// You can add any other shared TypeScript types or interfaces for your application below.