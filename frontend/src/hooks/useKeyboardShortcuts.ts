import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
  description?: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchedShortcut = shortcuts.find(shortcut => {
        return (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.altKey === !!shortcut.altKey &&
          !!event.shiftKey === !!shortcut.shiftKey
        );
      });

      if (matchedShortcut) {
        event.preventDefault();
        matchedShortcut.callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

// 预定义的快捷键
export const commonShortcuts = {
  save: { key: 's', ctrlKey: true, description: 'Ctrl+S 保存' },
  refresh: { key: 'r', ctrlKey: true, description: 'Ctrl+R 刷新' },
  search: { key: 'f', ctrlKey: true, description: 'Ctrl+F 搜索' },
  newItem: { key: 'n', ctrlKey: true, description: 'Ctrl+N 新建' },
  help: { key: 'h', ctrlKey: true, description: 'Ctrl+H 帮助' },
  escape: { key: 'Escape', description: 'Esc 取消' },
};