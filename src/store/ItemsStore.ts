import { makeAutoObservable, runInAction } from "mobx";
import { ApiClient } from "../api/client";
import type { Item } from "../types";

export class ItemsStore {
  // Все элементы (левая панель)
  allItems?: Item[] = [];
  allItemsTotal: number = 0;
  allItemsOffset: number = 0;
  allItemsFilter: string = "";
  allItemsLoading: boolean = false;

  // Выбранные элементы (правая панель)
  selectedItems?: Item[] = [];
  selectedItemsTotal: number = 0; // Количество отфильтрованных элементов
  selectedItemsAllTotal: number = 0; // Общее количество всех выбранных элементов (без фильтра)
  selectedItemsOffset: number = 0;
  selectedItemsFilter: string = "";
  selectedItemsLoading: boolean = false;

  // Константы
  readonly ITEMS_PER_PAGE = 20;

  constructor() {
    makeAutoObservable(this);
    this.loadFromLocalStorage();
  }

  // Инициализация - загрузка первых данных
  async initialize() {
    await Promise.all([this.loadAllItems(true), this.loadSelectedItems(true)]);
  }

  // Загрузка элементов для левой панели
  async loadAllItems(reset: boolean = false) {
    if (this.allItemsLoading) {
      return;
    }

    runInAction(() => {
      this.allItemsLoading = true;
      if (reset) {
        this.allItemsOffset = 0;
        this.allItems = [];
      }
    });

    try {
      const response = await ApiClient.getItems(
        this.allItemsOffset,
        this.ITEMS_PER_PAGE,
        this.allItemsFilter || undefined,
      );

      runInAction(() => {
        if (reset) {
          this.allItems = response.data;
        } else {
          const data = this.allItems ? this.allItems : [];
          this.allItems = [...data, ...response.data];
        }
        this.allItemsTotal = response?.pagination?.total;
        this.allItemsOffset =
          response?.pagination?.offset + response?.data?.length;
      });
    } catch (error) {
      console.error("Error loading all items:", error);
    } finally {
      runInAction(() => {
        this.allItemsLoading = false;
      });
    }
  }

  // Загрузка выбранных элементов для правой панели
  async loadSelectedItems(reset: boolean = false) {
    if (this.selectedItemsLoading) {
      return;
    }

    runInAction(() => {
      this.selectedItemsLoading = true;
      if (reset) {
        this.selectedItemsOffset = 0;
        this.selectedItems = [];
      }
    });

    try {
      const response = await ApiClient.getSelectedItems(
        this.selectedItemsOffset,
        this.ITEMS_PER_PAGE,
        this.selectedItemsFilter || undefined,
      );

      runInAction(() => {
        if (reset) {
          this.selectedItems = response.data;
        } else {
          const data = this.selectedItems ? this.selectedItems : [];
          this.selectedItems = [...data, ...response.data];
        }
        this.selectedItemsTotal = response.pagination.total;
        this.selectedItemsAllTotal = response.selectedIds.length;
        this.selectedItemsOffset =
          response.pagination.offset + response.data.length;
      });
    } catch (error) {
      console.error("Error loading selected items:", error);
    } finally {
      runInAction(() => {
        this.selectedItemsLoading = false;
      });
    }
  }

  // Установить фильтр для всех элементов
  setAllItemsFilter(filter: string) {
    this.allItemsFilter = filter;
    this.loadAllItems(true);
  }

  // Установить фильтр для выбранных элементов
  setSelectedItemsFilter(filter: string) {
    this.selectedItemsFilter = filter;
    this.loadSelectedItems(true);
  }

  // Добавить элемент в выбранные
  async selectItem(id: number) {
    // Проверка на дубликаты
    if (this.isItemSelected(id)) {
      console.warn("Item уже выбран:", id);
      return;
    }

    // Находим элемент, который добавляем
    const item = this.allItems?.find((item) => item.id === id);

    if (!item) {
      console.error("Item не найден:", id);
      return;
    }

    try {
      // Оптимистичное обновление UI
      runInAction(() => {
        // Удалить из левой панели
        this.allItems = this.allItems?.filter((item) => item.id !== id);
        this.allItemsTotal = Math.max(0, this.allItemsTotal - 1);

        // Добавить в начало правой панели
        this.selectedItems = [item, ...(this.selectedItems || [])];
        this.selectedItemsTotal = this.selectedItemsTotal + 1;
      });

      // Отправить на сервер
      await ApiClient.addToSelected(id);

      this.saveToLocalStorage();
    } catch (error) {
      console.error("Error selecting item:", error);

      // Откат изменений при ошибке
      runInAction(() => {
        // Вернуть в левую панель
        if (this.allItems) {
          this.allItems = [...this.allItems, item];
        } else {
          this.allItems = [item];
        }
        this.allItemsTotal = this.allItemsTotal + 1;

        // Убрать из правой панели
        this.selectedItems = this.selectedItems?.filter((i) => i.id !== id);
        this.selectedItemsTotal = Math.max(0, this.selectedItemsTotal - 1);
      });
    }
  }

  // Убрать элемент из выбранных
  async unselectItem(id: number) {
    // Находим элемент, который удаляем
    const item = this.selectedItems?.find((item) => item.id === id);

    if (!item) {
      console.error("Item не найден:", id);
      return;
    }

    try {
      // Оптимистичное обновление UI
      runInAction(() => {
        // Удалить из правой панели
        this.selectedItems = this.selectedItems?.filter((i) => i.id !== id);
        this.selectedItemsTotal = Math.max(0, this.selectedItemsTotal - 1);

        // Добавить в левую панель (в начало или конец, в зависимости от логики)
        this.allItems = [item, ...(this.allItems || [])];
        this.allItemsTotal = this.allItemsTotal + 1;
      });

      // Отправить на сервер
      await ApiClient.removeFromSelected(id);

      this.saveToLocalStorage();
    } catch (error) {
      console.error("Error unselecting item:", error);

      // Откат изменений при ошибке
      runInAction(() => {
        // Вернуть в правую панель
        if (this.selectedItems) {
          this.selectedItems = [...this.selectedItems, item];
        } else {
          this.selectedItems = [item];
        }
        this.selectedItemsTotal = this.selectedItemsTotal + 1;

        // Убрать из левой панели
        this.allItems = this.allItems?.filter((i) => i.id !== id);
        this.allItemsTotal = Math.max(0, this.allItemsTotal - 1);
      });
    }
  }

  // Обновить порядок выбранных элементов
  async reorderSelectedItems(newOrder: Item[]) {
    const ids = newOrder.map((item) => item.id);

    try {
      await ApiClient.updateSelectedOrder(ids);

      runInAction(() => {
        this.selectedItems = newOrder;
      });

      this.saveToLocalStorage();
    } catch (error) {
      console.error("Error reordering items:", error);
      // Откатить изменения при ошибке
      await this.loadSelectedItems(true);
    }
  }

  // Создать новый элемент
  async createItem(id: number) {
    try {
      await ApiClient.createItem(id);

      // Перезагрузить левую панель
      await this.loadAllItems(true);
    } catch (error) {
      console.error("Error creating item:", error);
      throw error;
    }
  }

  // Загрузить больше элементов для левой панели (infinity scroll)
  loadMoreAllItems() {
    if (this.allItemsLoading || !this.allItems) {
      return;
    }
    if (this.allItemsOffset >= this.allItemsTotal) {
      return;
    }
    this.loadAllItems(false);
  }

  // Загрузить больше элементов для правой панели (infinity scroll)
  loadMoreSelectedItems() {
    if (this.selectedItemsLoading || !this.selectedItems) {
      return;
    }
    if (this.selectedItemsOffset >= this.selectedItemsTotal) {
      return;
    }
    this.loadSelectedItems(false);
  }

  // Сохранить состояние в localStorage
  private saveToLocalStorage() {
    try {
      const state = {
        selectedIds: this.selectedItems?.map((item) => item.id),
      };
      localStorage.setItem("itemsStore", JSON.stringify(state));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  // Загрузить состояние из localStorage
  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem("itemsStore");
      if (stored) {
        const state = JSON.parse(stored);
        // Состояние будет применено при загрузке данных с сервера
        console.log("Loaded state from localStorage:", state);
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  }

  // Проверить, выбран ли элемент
  isItemSelected(id: number): boolean {
    return this.selectedItems?.some((item) => item.id === id) ?? false;
  }
}

export const itemsStore = new ItemsStore();
