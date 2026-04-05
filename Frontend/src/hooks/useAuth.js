import { useEffect, useState } from "react";
import { getCurrentUser } from "../services/api";
import { getStoredAuth, subscribeToAuthChanges } from "../services/auth";

export function useAuth() {
  const [user, setUser] = useState(() => getStoredAuth().user);
  const [loading, setLoading] = useState(Boolean(getStoredAuth().token));

  useEffect(() => {
    const sync = () => {
      const session = getStoredAuth();
      setUser(session.user);
      setLoading(false);
    };

    sync();
    const unsubscribe = subscribeToAuthChanges(sync);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const session = getStoredAuth();
    if (!session.token) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then((response) => {
        setUser(response.user);
      })
      .catch((error) => {
        if (error?.status === 401) {
          setUser(null);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { user, loading };
}
