import React, { useCallback, useMemo } from "react";
import { List, type RowComponentProps } from "react-window";
import styles from "./VirtualList.module.css";
import type { Item } from "../../types";

type RowProps = {
  items: Item[];
  renderItem: (item: Item, index: number) => React.ReactNode;
};

export interface VirtualListProps {
  items: Item[];
  height: number;
  itemHeight: number;
  renderItem: (item: Item, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  overscanCount?: number;
  /**
   * Кол-во айтев, при достижении которого будет вызван `onLoadMore`.
   * Пример: 5 означает "когда последняя видимая строка находится в пределах 5 строк от конца".
   */
  loadMoreThreshold?: number;
}

const Row = ({
  index,
  style,
  ariaAttributes,
  items,
  renderItem,
}: RowComponentProps<RowProps>): React.ReactElement | null => {
  const item = items[index];
  if (!item) return null;

  return (
    <div style={style} className={styles.row} {...ariaAttributes}>
      {renderItem(item, index)}
    </div>
  );
};

Row.displayName = "VirtualListRow";

export const VirtualList: React.FC<VirtualListProps> = ({
  items,
  height,
  itemHeight,
  renderItem,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  overscanCount = 5,
  loadMoreThreshold = 5,
}) => {
  const rowCount = items.length;

  const rowProps = useMemo<RowProps>(() => {
    return { items, renderItem };
  }, [items, renderItem]);

  const handleRowsRendered = useCallback(
    (visibleRows: { startIndex: number; stopIndex: number }) => {
      if (!onLoadMore || !hasMore || isLoading) return;
      if (rowCount === 0) return;

      const triggerIndex = Math.max(0, rowCount - 1 - loadMoreThreshold);
      if (visibleRows.stopIndex >= triggerIndex) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading, rowCount, loadMoreThreshold],
  );

  return (
    <div className={styles.container}>
      <List<RowProps>
        defaultHeight={height}
        rowCount={rowCount}
        rowHeight={itemHeight}
        rowComponent={Row}
        rowProps={rowProps}
        onRowsRendered={handleRowsRendered}
        overscanCount={overscanCount}
        style={{ width: "100%", height }}
      />

      {isLoading && <div className={styles.loader}>Загрузка...</div>}
    </div>
  );
};

VirtualList.displayName = "VirtualList";
