export interface User { id: string; username: string; displayName: string; roles: string[]; shopIds: string[] }
export interface Shop { id: string; platform: string; code: string; name: string }
export interface Product { id: string; name: string; brand: string; category: string; status: string; skus: Array<{ id: string; code: string; availableStock: number; warningStock: number }> }
export interface Task { id: string; type: string; status: string; provider: string; createdAt: string; errorMessage?: string; productId?: string; creativeVersionId?: string; demoProductId?: string; demoCreativeId?: string }
