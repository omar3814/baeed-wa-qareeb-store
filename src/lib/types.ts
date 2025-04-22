// src/lib/types.ts

// Defines the structure of a Product object based on our database table
export interface Product {
	id: string;
	created_at: string; // Supabase timestamps are strings by default
	name: string;
	description?: string | null; // Optional string
	price: number;
	images?: string[] | null; // Optional array of image URL strings
	sizes_stock: { [size: string]: number }; // An object where keys are size strings (e.g., "S") and values are stock numbers
}

// Defines the structure for the Site Settings object
export interface SiteSettings {
	id: number; // Should always be 1
	updated_at: string;
	store_name: string;
	banner_image_url?: string | null;
	collection_title: string;
	phone_number?: string | null;
	address: string;
	working_hours: string;
	delivery_message: string;
	instagram_url?: string | null;
	snapchat_url?: string | null;
}