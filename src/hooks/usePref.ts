import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * 사용자별 UI 선호값 저장 (뷰·필터·밀도 등).
 * 현재는 브라우저 로컬 저장(사용자 id로 네임스페이스). 추후 DB 동기화로 확장 가능.
 */
export function usePref<T>(key: string, fallback: T): [T, (v: T) => void] {
  const { session } = useAuth();
  const uid = session?.user.id ?? "anon";
  const storageKey = `pref:${uid}:${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw != null ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  });

  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(storageKey, JSON.stringify(v));
      } catch {
        /* 저장 실패는 무시 */
      }
    },
    [storageKey],
  );

  return [value, set];
}
