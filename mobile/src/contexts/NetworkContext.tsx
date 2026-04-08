import { createContext, useContext, useEffect, useState } from "react";
import * as Network from "expo-network";

interface NetworkContextValue {
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ isConnected: true });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const checkNetwork = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        setIsConnected(
          !!(state.isConnected && state.isInternetReachable)
        );
      } catch {
        setIsConnected(false);
      }
    };

    checkNetwork();
    interval = setInterval(checkNetwork, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
