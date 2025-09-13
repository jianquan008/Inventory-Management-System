import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let mockCallback: jest.Mock;

  beforeEach(() => {
    mockCallback = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call callback when matching key is pressed', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        callback: mockCallback,
        description: 'Save'
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // 模拟按键事件
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    });

    document.dispatchEvent(event);

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should not call callback when key does not match', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        callback: mockCallback,
        description: 'Save'
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // 模拟不匹配的按键事件
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true
    });

    document.dispatchEvent(event);

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should not call callback when modifier keys do not match', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        callback: mockCallback,
        description: 'Save'
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // 模拟没有Ctrl键的按键事件
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: false,
      bubbles: true
    });

    document.dispatchEvent(event);

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should handle multiple shortcuts', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        callback: callback1,
        description: 'Save'
      },
      {
        key: 'r',
        ctrlKey: true,
        callback: callback2,
        description: 'Refresh'
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // 测试第一个快捷键
    const event1 = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    });
    document.dispatchEvent(event1);

    // 测试第二个快捷键
    const event2 = new KeyboardEvent('keydown', {
      key: 'r',
      ctrlKey: true,
      bubbles: true
    });
    document.dispatchEvent(event2);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('should handle alt and shift modifiers', () => {
    const shortcuts = [
      {
        key: 'F4',
        altKey: true,
        callback: mockCallback,
        description: 'Alt+F4'
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', {
      key: 'F4',
      altKey: true,
      bubbles: true
    });

    document.dispatchEvent(event);

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('should prevent default behavior when shortcut matches', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        callback: mockCallback,
        description: 'Save'
      }
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    });

    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(mockCallback).toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    const shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        callback: mockCallback,
        description: 'Save'
      }
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    // 卸载组件
    unmount();

    // 尝试触发事件
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    });

    document.dispatchEvent(event);

    // 回调不应该被调用
    expect(mockCallback).not.toHaveBeenCalled();
  });
});