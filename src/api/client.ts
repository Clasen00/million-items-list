import type { Item, PaginatedResponse } from "../types";

const API_BASE_URL = "http://localhost:3000/api";

export class ApiClient {
  private static async request<T>(
    url: string,
    options?: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  // Получить все элементы с пагинацией и фильтрацией
  static async getItems(
    offset: number = 0,
    limit: number = 20,
    filter?: string,
  ): Promise<PaginatedResponse<Item>> {
    const params = new URLSearchParams({
      offset: offset.toString(),
      limit: limit.toString(),
    });

    if (filter) {
      params.append("filter", filter);
    }

    return this.request<PaginatedResponse<Item>>(`/items?${params}`);
  }

  // Получить выбранные элементы с пагинацией и фильтрацией
  static async getSelectedItems(
    offset: number = 0,
    limit: number = 20,
    filter?: string,
  ): Promise<PaginatedResponse<Item>> {
    const params = new URLSearchParams({
      offset: offset.toString(),
      limit: limit.toString(),
    });

    if (filter) {
      params.append("filter", filter);
    }

    return this.request<PaginatedResponse<Item>>(`/selected?${params}`);
  }

  // Добавить элемент в выбранные
  static async addToSelected(id: number): Promise<void> {
    await this.request<unknown>("/selected", {
      method: "POST",
      body: JSON.stringify({ ids: [id] }),
    });
  }

  // Удалить элемент из выбранных
  static async removeFromSelected(id: number): Promise<void> {
    await this.request<unknown>("/selected", {
      method: "DELETE",
      body: JSON.stringify({ ids: [id] }),
    });
  }

  // Обновить порядок выбранных элементов
  static async updateSelectedOrder(ids: number[]): Promise<void> {
    await this.request<unknown>("/selected/order", {
      method: "PUT",
      body: JSON.stringify({ ids }),
    });
  }

  // Создать новый элемент
  static async createItem(id: number): Promise<Item> {
    return this.request<Item>("/items", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
  }
}
