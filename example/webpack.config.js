const path = require('path');

module.exports = {
	entry: { app: './src/entry.ts' },
	output: {
		path: path.resolve(__dirname, './build'),
		filename: 'bundle.js',
		publicPath: '/',
	},
	devtool: 'source-map',
	resolve: {
		extensions: ['.ts', '.js', 'html'],
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: 'ts-loader',
			},
			{
				test: /\.css/,
				loaders: [ 'style-loader', 'css-loader' ],
			},
			{
				test: /\.styl/,
				use: [ 'style-loader', 'css-loader', 'stylus-loader' ],
			},
		],
	},
};
