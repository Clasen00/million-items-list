import { observer } from "mobx-react-lite";
import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item } from "../../types";
import { itemsStore } from "../../store/ItemsStore";

interface SortableItemProps {
  item: Item;
  onRemove: (item: Item) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ item, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`list-item right-panel-item ${isDragging ? "dragging" : ""}`}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>
      <span className="item-id">ID: {item.id}</span>
      <button
        className="item-action-btn remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item);
        }}
      >
        ×
      </button>
    </div>
  );
};

export const RightPanel: React.FC = observer(() => {
  const [filter, setFilter] = useState("");
  const debounceTimerRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleFilterChange = (value: string) => {
    setFilter(value);

    // Отменяем предыдущий таймер
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Устанавливаем новый таймер с задержкой 300ms
    debounceTimerRef.current = setTimeout(() => {
      itemsStore.setSelectedItemsFilter(value);
    }, 300);
  };

  // Очистка таймера при размонтировании компонента
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleRemoveItem = (item: Item) => {
    itemsStore.unselectItem(item.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!itemsStore.selectedItems) {
      return;
    }

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = itemsStore.selectedItems?.findIndex(
      (item) => item.id === active.id,
    );
    const newIndex = itemsStore.selectedItems.findIndex(
      (item) => item.id === over.id,
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(itemsStore.selectedItems, oldIndex, newIndex);
      itemsStore.reorderSelectedItems(newOrder);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollBottom = target.scrollTop + target.clientHeight;
    const threshold = target.scrollHeight - 100;

    if (scrollBottom >= threshold && !itemsStore.selectedItemsLoading) {
      itemsStore.loadMoreSelectedItems();
    }
  };

  return (
    <div className="panel right-panel">
      <div className="panel-header">
        <h2>Выбранные элементы</h2>
        <div className="panel-controls">
          <input
            type="text"
            placeholder="Фильтр по ID..."
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="panel-stats">
          Показано: {itemsStore.selectedItems?.length || 0} из{" "}
          {Math.max(
            itemsStore.selectedItems?.length || 0,
            itemsStore.selectedItemsTotal,
          )}
          {itemsStore.selectedItemsFilter &&
            ` (всего выбрано: ${itemsStore.selectedItemsAllTotal || 0})`}
        </div>
      </div>

      <div className="panel-content" onScroll={handleScroll}>
        {itemsStore.selectedItems?.length === 0 &&
        !itemsStore.selectedItemsLoading ? (
          <div className="empty-state">
            <p>Нет выбранных элементов</p>
            <p className="empty-state-hint">
              Выберите элементы из левой панели
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={itemsStore.selectedItems?.map((item) => item.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="sortable-list">
                {itemsStore.selectedItems?.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {itemsStore.selectedItemsLoading && (
          <div className="loading-indicator">Загрузка...</div>
        )}
      </div>
    </div>
  );
});

RightPanel.displayName = "RightPanel";
