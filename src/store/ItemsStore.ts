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
  selectedItemsTotal: number = 0;
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
  async loadAllItems(reset: boolean = false, force: boolean = false) {
    if (this.allItemsLoading && !force) {
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
  async loadSelectedItems(reset: boolean = false, force: boolean = false) {
    if (this.selectedItemsLoading && !force) {
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
    runInAction(() => {
      this.selectedItemsLoading = true;
    });

    try {
      await ApiClient.addToSelected(id);

      runInAction(() => {
        // Удалить из левой панели
        this.allItems = this.allItems?.filter((item) => item.id !== id);
        this.allItemsTotal = Math.max(0, this.allItemsTotal - 1);
      });

      // Перезагрузить правую панель
      await this.loadSelectedItems(true, true);
      this.saveToLocalStorage();
    } catch (error) {
      console.error("Error selecting item:", error);
    } finally {
      runInAction(() => {
        this.selectedItemsLoading = false;
      });
    }
  }

  // Убрать элемент из выбранных
  async unselectItem(id: number) {
    runInAction(() => {
      this.selectedItemsLoading = true;
    });

    try {
      await ApiClient.removeFromSelected(id);

      runInAction(() => {
        // Удалить из правой панели
        this.selectedItems = this.selectedItems?.filter(
          (item) => item.id !== id,
        );
        this.selectedItemsTotal = Math.max(0, this.selectedItemsTotal - 1);
      });

      // Перезагрузить левую панель
      await this.loadAllItems(true, true);
      this.saveToLocalStorage();
    } catch (error) {
      console.error("Error unselecting item:", error);
    } finally {
      runInAction(() => {
        this.selectedItemsLoading = false;
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
    if (this.allItems.length >= this.allItemsTotal) {
      return;
    }

    this.loadAllItems(false);
  }

  // Загрузить больше элементов для правой панели (infinity scroll)
  loadMoreSelectedItems() {
    if (this.selectedItemsLoading || !this.selectedItems) {
      return;
    }
    if (this.selectedItems?.length >= this.selectedItemsTotal) {
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
