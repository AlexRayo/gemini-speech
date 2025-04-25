module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel"
    ],
    plugins: [
      ['module-resolver', {
        root: ['./'],              // la raíz de tu proyecto
        extensions: [
          '.ios.js', '.android.js', '.js', '.ts', '.tsx',
          '.json', '.jsx', '.native.js'
        ],
        alias: {
          '@/components': './components',
          '@/constants':     './constants',
          '@/app':        './app',
          '@/hooks':      './hooks',
          '@/assets':     './assets'
        },
      }],
      // otros plugins que necesites…
    ],
    env: {
      production: {
        plugins: ['react-native-paper/babel']
      }
    },
  };
};
