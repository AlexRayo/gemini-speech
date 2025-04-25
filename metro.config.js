const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.resolver.alias = {
  '@/components': path.resolve(__dirname, 'components'),
  '@/constants': path.resolve(__dirname, 'constants'),
  '@/app':        path.resolve(__dirname, 'app'),
  '@/hooks':      path.resolve(__dirname, 'hooks'),
  '@/assets':     path.resolve(__dirname, 'assets'),
};
module.exports = withNativeWind(config, { input: './global.css' });
