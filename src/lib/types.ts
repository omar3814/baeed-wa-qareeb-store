// === Code for src/lib/types.ts (Updated Product Type) ===

export interface Category {
	id: string;
	created_at: string;
	name: string;
	sort_order?: number | null;
}

export interface Product {
	id: string;
	created_at: string;
	name: string;
	description?: string | null;
	price: number;
	images?: string[] | null; // Allows multiple image URLs
	sizes_stock: { [size: string]: number };
	category_id?: string | null; // Foreign Key
    // Used when fetching product data with category name joined
    categories?: { id?: string; name: string } | null;
}

export interface SiteSettings {
	id: number;
	updated_at: string;
	store_name: string;
	banner_image_url?: string | null;
    logo_image_url?: string | null;
	collection_title: string;
	phone_number?: string | null;
	address: string;
	working_hours: string;
	delivery_message: string;
	instagram_url?: string | null;
	snapchat_url?: string | null;
}

export interface Order {
    id: string;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    order_details: {
        productId?: string;
        productName?: string;
        size?: string;
        quantity?: number;
        price?: number;
        imageUrl?: string;
    };
    status: string;
    total_price: number;
}