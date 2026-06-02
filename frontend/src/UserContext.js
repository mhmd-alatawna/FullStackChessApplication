import { createContext, useContext, useState } from "react";

// Global context that holds the logged-in user's data.
// Available throughout the app via the useUser() hook.
export const UserContext = createContext(null);

// Wrap the entire app with this provider so all pages can access user state.
export function UserProvider({ children }) {
  // user: { userId, userRole, firstName, lastName } or null when logged out
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

// Convenience hook — import this instead of useContext(UserContext) directly.
export function useUser() {
  return useContext(UserContext);
}
