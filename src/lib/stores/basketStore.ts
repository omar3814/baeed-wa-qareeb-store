// === Code for src/lib/stores/basketStore.ts (with maxStock) ===
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface BasketItem {
	productId: string;
	name: string;
	size: string;
	quantity: number;
	price: number;
	imageUrl?: string | null;
    uniqueId: string;
    maxStock: number; // <<< ADDED maxStock field
}

function generateUniqueId(productId: string, size: string): string { return `${productId}_${size}`; }

const initialValue: BasketItem[] = browser && localStorage.getItem('basket') ? JSON.parse(localStorage.getItem('basket')!) : [];
const basket = writable<BasketItem[]>(initialValue);

basket.subscribe((value) => { if (browser) { localStorage.setItem('basket', JSON.stringify(value)); } });

export const basketStore = {
	subscribe: basket.subscribe,

	// --- Modified addItem to accept and store maxStock ---
	addItem: (item: Omit<BasketItem, 'uniqueId' | 'quantity'> & { quantity?: number }) => {
        const uniqueId = generateUniqueId(item.productId, item.size);
        const quantityToAdd = item.quantity || 1;

		basket.update((currentBasket) => {
			const existingItemIndex = currentBasket.findIndex(i => i.uniqueId === uniqueId);
			if (existingItemIndex > -1) {
				const updatedBasket = [...currentBasket];
                // Increment quantity, ensuring it doesn't exceed the stored maxStock for that item
				const currentItem = updatedBasket[existingItemIndex];
                currentItem.quantity = Math.min(currentItem.maxStock, currentItem.quantity + quantityToAdd); // Cap at maxStock
				return updatedBasket;
			} else {
                // Add new item, ensuring quantity doesn't exceed maxStock initially
                const initialQuantity = Math.min(item.maxStock, quantityToAdd);
                // Ensure maxStock is at least 1 if adding, otherwise something is wrong upstream
                const validMaxStock = Math.max(1, item.maxStock);
				return [...currentBasket, { ...item, uniqueId, quantity: initialQuantity, maxStock: validMaxStock }];
			}
		});
	},

	removeItem: (uniqueId: string) => { basket.update((cb) => cb.filter(item => item.uniqueId !== uniqueId)); },

	// --- Modified updateItemQuantity to respect maxStock ---
	updateItemQuantity: (uniqueId: string, newQuantity: number) => {
		basket.update((currentBasket) => {
			const itemIndex = currentBasket.findIndex(i => i.uniqueId === uniqueId);
			if (itemIndex > -1) {
				const updatedBasket = [...currentBasket];
                const item = updatedBasket[itemIndex];
                // Clamp new quantity between 1 and maxStock
                const clampedQuantity = Math.max(1, Math.min(item.maxStock, newQuantity));

				if (clampedQuantity > 0) { // Should always be true now due to Math.max(1,...)
					updatedBasket[itemIndex].quantity = clampedQuantity;
                    return updatedBasket;
				} else {
                    // This case should theoretically not happen if maxStock >= 1, but included for safety
					updatedBasket.splice(itemIndex, 1); // Remove if quantity somehow becomes invalid
                    return updatedBasket;
				}
			}
			return currentBasket;
		});
	},

    getTotalItems: (items: BasketItem[]): number => items.reduce((t, i) => t + i.quantity, 0),
    getTotalPrice: (items: BasketItem[]): number => items.reduce((t, i) => t + (i.price * i.quantity), 0),
	clearBasket: () => { basket.set([]); }
};