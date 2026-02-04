import { observer } from "mobx-react-lite";
import { useState } from "react";
import { itemsStore } from "../../store/ItemsStore";
import type { Item } from "../../types";
import { VirtualList } from "../VirtualList/VirtualList";

export const LeftPanel: React.FC = observer(() => {
  const [filter, setFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemId, setNewItemId] = useState("");
  const [error, setError] = useState("");

  const handleFilterChange = (value: string) => {
    setFilter(value);
    itemsStore.setAllItemsFilter(value);
  };

  const handleAddItem = async () => {
    setError("");
    const id = parseInt(newItemId, 10);

    if (isNaN(id)) {
      setError("ID должен быть числом");
      return;
    }

    try {
      await itemsStore.createItem(id);
      setShowAddModal(false);
      setNewItemId("");
    } catch {
      setError(
        "Ошибка при создании элемента. Возможно, элемент с таким ID уже существует.",
      );
    }
  };

  const handleItemClick = (item: Item) => {
    itemsStore.selectItem(item.id);
  };

  const renderItem = (item: Item, index: number) => {
    return (
      <div
        className="list-item left-panel-item"
        data-index={index}
        onClick={() => handleItemClick(item)}
      >
        <span className="item-id">ID: {item.id}</span>
        <button
          className="item-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleItemClick(item);
          }}
        >
          →
        </button>
      </div>
    );
  };

  return (
    <div className="panel left-panel">
      <div className="panel-header">
        <h2>Все элементы</h2>
        <div className="panel-controls">
          <input
            type="text"
            placeholder="Фильтр по ID..."
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="filter-input"
          />
          <button onClick={() => setShowAddModal(true)} className="add-button">
            + Добавить элемент
          </button>
        </div>
        <div className="panel-stats">
          Показано: {itemsStore?.allItems?.length} из {itemsStore.allItemsTotal}
        </div>
      </div>

      <div className="panel-content">
        <VirtualList
          items={itemsStore.allItems || []}
          height={600}
          itemHeight={50}
          renderItem={renderItem}
          onLoadMore={() => itemsStore.loadMoreAllItems()}
          hasMore={
            itemsStore?.allItems &&
            itemsStore.allItems.length < itemsStore.allItemsTotal
          }
          isLoading={itemsStore.allItemsLoading}
        />
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Добавить новый элемент</h3>
              <button
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <label>
                ID элемента:
                <input
                  type="number"
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  placeholder="Введите ID"
                  className="modal-input"
                  autoFocus
                />
              </label>
              {error && <div className="error-message">{error}</div>}
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowAddModal(false)}
                className="button-secondary"
              >
                Отмена
              </button>
              <button onClick={handleAddItem} className="button-primary">
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

LeftPanel.displayName = "LeftPanel";
