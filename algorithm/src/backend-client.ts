// Backend Client for Developer 1's E-commerce System
// Fetches stock and market volume data for price calculations

export interface StockData {
  categoryId: string; // UUID
  totalStock: number;
  productCount: number;
}

export interface MarketVolumeData {
  categoryId: string; // UUID
  totalSales: number;
  totalQuantity: number;
  totalRevenue: number;
  periodDays: 30;
}

export interface CategoryData {
  id: string; // UUID
  slug: string;
  name: string;
}

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:3001';

export class BackendClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = BACKEND_BASE_URL, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.INTERNAL_API_KEY;
  }

  private async fetchWithAuth<T>(endpoint: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-internal-key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch all categories to get UUID mappings
   */
  async fetchCategories(): Promise<CategoryData[]> {
    return this.fetchWithAuth<CategoryData[]>('/categories');
  }

  /**
   * Fetch stock data for a specific category by UUID
   */
  async fetchStock(categoryId: string): Promise<StockData> {
    return this.fetchWithAuth<StockData>(`/internal/stock/${categoryId}`);
  }

  /**
   * Fetch market volume data for a specific category by UUID
   */
  async fetchMarketVolume(categoryId: string): Promise<MarketVolumeData> {
    return this.fetchWithAuth<MarketVolumeData>(`/internal/market-volume/${categoryId}`);
  }

  /**
   * Fetch stock data for all categories
   */
  async fetchAllStocks(): Promise<Map<string, StockData>> {
    const categories = await this.fetchCategories();
    const stockMap = new Map<string, StockData>();

    await Promise.all(
      categories.map(async (category) => {
        try {
          const stock = await this.fetchStock(category.id);
          stockMap.set(category.id, stock);
        } catch (error) {
          console.error(`Failed to fetch stock for category ${category.id}:`, error);
        }
      }),
    );

    return stockMap;
  }

  /**
   * Fetch market volume data for all categories
   */
  async fetchAllMarketVolumes(): Promise<Map<string, MarketVolumeData>> {
    const categories = await this.fetchCategories();
    const volumeMap = new Map<string, MarketVolumeData>();

    await Promise.all(
      categories.map(async (category) => {
        try {
          const volume = await this.fetchMarketVolume(category.id);
          volumeMap.set(category.id, volume);
        } catch (error) {
          console.error(`Failed to fetch market volume for category ${category.id}:`, error);
        }
      }),
    );

    return volumeMap;
  }

  /**
   * Fetch all data needed for price calculation
   */
  async fetchAllMarketData(): Promise<{
    categories: CategoryData[];
    stocks: Map<string, StockData>;
    volumes: Map<string, MarketVolumeData>;
  }> {
    const categories = await this.fetchCategories();
    const [stocks, volumes] = await Promise.all([
      this.fetchAllStocks(),
      this.fetchAllMarketVolumes(),
    ]);

    return { categories, stocks, volumes };
  }
}

export const backendClient = new BackendClient();
