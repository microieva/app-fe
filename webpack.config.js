const path = require('path');

module.exports = {
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        include: path.resolve('src'),
        loader: 'istanbul-instrumenter-loader',
        options: { esModules: true },
        enforce: 'post',
        exclude: [/node_modules/, /\.spec\.ts$/],
      },
    ],
  },
};

  