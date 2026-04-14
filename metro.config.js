const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Resolve modules from both mobile/node_modules and the root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
];

// Ensure React and related packages resolve to a single copy from mobile/node_modules
// This prevents the "Invalid hook call" error caused by duplicate React instances
// when Metro also watches the workspace root (which has react@19.2.4 from @/web)
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-native"),
};

// Block server-only modules from being bundled by Metro
// kysely and pg are only used at runtime by the web server
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "pg" || moduleName === "kysely") {
    return { type: "empty" };
  }

  if (typeof originalResolveRequest === "function") {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
