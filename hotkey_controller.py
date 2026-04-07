from __future__ import annotations

import threading
from typing import Callable

import keyboard


HotkeyCallback = Callable[[], None]


class HotkeyController:
    """
    Push-to-talk hotkey controller.

    Modes:
    - hold: press starts recording, release stops recording
    - toggle: first press starts recording, second press stops recording
    """

    def __init__(
        self,
        hotkey: str,
        on_start: HotkeyCallback,
        on_stop: HotkeyCallback,
        mode: str = "hold",
    ) -> None:
        self.hotkey = hotkey
        self.on_start = on_start
        self.on_stop = on_stop
        self.mode = mode

        self._is_pressed = False
        self._is_recording = False
        self._lock = threading.Lock()
        self._hook_handles: list[object] = []
        self._wait_event = threading.Event()

    def start(self) -> None:
        if self.mode not in {"hold", "toggle"}:
            raise ValueError("mode must be 'hold' or 'toggle'")

        self._hook_handles.append(keyboard.on_press_key(self.hotkey, self._handle_press, suppress=False))
        self._hook_handles.append(keyboard.on_release_key(self.hotkey, self._handle_release, suppress=False))

    def stop(self) -> None:
        for handle in self._hook_handles:
            keyboard.unhook(handle)
        self._hook_handles.clear()
        self._wait_event.set()

    def wait_forever(self) -> None:
        self._wait_event.wait()

    def _handle_press(self, _event) -> None:
        with self._lock:
            if self._is_pressed:
                return

            self._is_pressed = True
            if self.mode == "hold":
                if not self._is_recording:
                    self._is_recording = True
                    self.on_start()
                return

            if self._is_recording:
                self._is_recording = False
                self.on_stop()
            else:
                self._is_recording = True
                self.on_start()

    def _handle_release(self, _event) -> None:
        with self._lock:
            self._is_pressed = False
            if self.mode == "hold" and self._is_recording:
                self._is_recording = False
                self.on_stop()
