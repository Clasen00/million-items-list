"use client";

import { useEffect } from "react";
import { observer } from "mobx-react-lite";
import { itemsStore } from "./store/ItemsStore";
import "./App.css";
import { LeftPanel, RightPanel } from "./components";

const App: React.FC = observer(() => {
  useEffect(() => {
    itemsStore.initialize();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Million Items List</h1>
        <p className="app-description">
          Виртуализированные списки с возможностью выбора и сортировки
        </p>
      </header>

      <main className="app-main">
        <LeftPanel />
        <RightPanel />
      </main>
    </div>
  );
});

App.displayName = "App";

export default App;
